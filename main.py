import os
from dotenv import load_dotenv
import speech_recognition as sr
from langgraph.checkpoint.mongodb import MongoDBSaver
from graph import create_chat_graph


load_dotenv()

MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://admin:admin@localhost:27017/codeecho")
THREAD_ID = os.getenv("CODEECHO_THREAD_ID", "17")
STREAM_CONFIG = {"configurable": {"thread_id": THREAD_ID}}


def _transcribe_audio(recognizer: sr.Recognizer, audio: sr.AudioData) -> str:
    """Transcribe microphone input and gracefully handle errors."""
    try:
        return recognizer.recognize_google(audio)
    except sr.UnknownValueError:
        print("Speech not understood. Please try again.")
        return ""
    except sr.RequestError as exc:
        print(f"Speech recognition service error: {exc}")
        return ""


def main() -> None:
    """Entry point for the local voice-driven chat experience."""
    with MongoDBSaver.from_conn_string(MONGODB_URI) as checkpointer:
        graph = create_chat_graph(checkpointer=checkpointer)

        recognizer = sr.Recognizer()
        with sr.Microphone() as source:
            recognizer.adjust_for_ambient_noise(source, duration=1)
            recognizer.pause_threshold = 1

            while True:
                print("Please speak something...")
                audio = recognizer.listen(source)
                transcript = _transcribe_audio(recognizer, audio)

                if not transcript:
                    continue

                print("You said:", transcript)

                for event in graph.stream(
                    {"messages": [{"role": "user", "content": transcript}]},
                    STREAM_CONFIG,
                    stream_mode="values",
                ):
                    if "messages" in event:
                        event["messages"][-1].pretty_print()

if __name__ == "__main__":
    main()
