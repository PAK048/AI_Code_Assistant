import os
import platform
import subprocess
from pathlib import Path
from typing import Annotated, Optional
from typing_extensions import TypedDict
from langgraph.graph.message import add_messages
from langchain.chat_models import init_chat_model
from langgraph.prebuilt import ToolNode, tools_condition
from langgraph.graph import StateGraph, START, END
from langchain_core.tools import tool
from langchain.schema import SystemMessage


class State(TypedDict):
    messages: Annotated[list, add_messages]


SANDBOX_ROOT = Path(os.getenv("CODEECHO_SANDBOX", "chat_gpt")).resolve()
SANDBOX_ROOT.mkdir(parents=True, exist_ok=True)


def _sanitize_and_resolve(path_str: str) -> Path:
    """Return an absolute path inside the sandbox, raising if traversal detected."""
    normalized = Path(path_str)
    candidate = (SANDBOX_ROOT / normalized).resolve()
    if not str(candidate).startswith(str(SANDBOX_ROOT)):
        raise ValueError("Attempted to access path outside of sandbox")
    return candidate


@tool
def run_command(cmd: str, file_content: Optional[str] = None) -> str:
    """Write files or execute shell commands inside the sandbox safely."""

    # Write-to-file mode
    if file_content is not None:
        try:
            safe_path = _sanitize_and_resolve(cmd)
            safe_path.parent.mkdir(parents=True, exist_ok=True)
            safe_path.write_text(file_content, encoding="utf-8")
            relative_path = safe_path.relative_to(SANDBOX_ROOT)
            return f"File '{relative_path}' created with provided content."
        except Exception as exc:  # noqa: BLE001
            return f"Failed to write file: {exc}"

    # Command execution mode
    shell_prefix = []
    if platform.system() == "Windows":
        shell_prefix = ["powershell", "-Command"]

    try:
        completed = subprocess.run(
            shell_prefix + [cmd] if shell_prefix else cmd,
            shell=True if not shell_prefix else False,
            cwd=SANDBOX_ROOT,
            capture_output=True,
            text=True,
            timeout=float(os.getenv("CODEECHO_CMD_TIMEOUT", "120")),
            check=False,
        )
    except subprocess.TimeoutExpired:
        return "Command timed out after allotted seconds."
    except Exception as exc:  # noqa: BLE001
        return f"Command failed to start: {exc}"

    stdout = completed.stdout.strip()
    stderr = completed.stderr.strip()
    exit_code = completed.returncode

    response_parts = [f"Exit code: {exit_code}"]
    if stdout:
        response_parts.append(f"STDOUT:\n{stdout}")
    if stderr:
        response_parts.append(f"STDERR:\n{stderr}")

    return "\n".join(response_parts)


# Initialize LLM
llm = init_chat_model(model_provider="openai", model="gpt-4.1")
llm_with_tool = llm.bind_tools(tools=[run_command])


def chatbot(state: State):
    system_prompt = SystemMessage(content="""
        You are an AI Coding assistant.
        - All code must be human-readable line by line, without enclosing lines in strings.
        - All files should be saved inside 'chat_gpt/'.
        - On Windows, use PowerShell-compatible commands.
        - Never generate Unix-style commands like `touch` or `mkdir -p`.
        - If you need to create a file, you can just specify the file path and content,
          and the run_command tool will write it safely.
          
        Example:
        User: "Create a Python file selection_sort.py and write selection sort."
        AI should call:
        run_command(cmd="chat_gpt/selection_sort.py", file_content="<python code here>")
        user: create a react app 
        Ai should call 
        run command tool :and do npm create vite@latest my-app
                                  
    """)

    message = llm_with_tool.invoke([system_prompt] + state["messages"])
    # assert len(message.tool_calls) <= 1
    return {"messages": [message]}


tool_node = ToolNode(tools=[run_command])

graph_builder = StateGraph(State)
graph_builder.add_node("chatbot", chatbot)
graph_builder.add_node("tools", tool_node)

graph_builder.add_edge(START, "chatbot")
graph_builder.add_conditional_edges("chatbot", tools_condition)
graph_builder.add_edge("tools", "chatbot")
graph_builder.add_edge("chatbot", END)

graph = graph_builder.compile()


def create_chat_graph(checkpointer=None):
    return graph_builder.compile(checkpointer=checkpointer)
