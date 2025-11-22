

Here's a simple React login component using functional components and hooks. This component includes Email and Password fields, and it uses the `useState` hook to manage the form state.

```jsx
import React, { useState } from 'react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();
    // Here you can add your login logic, e.g., sending a request to your backend
    console.log('Email:', email);
    console.log('Password:', password);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="email"
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="password">Password:</label>
        <input
          type="password"
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <button type="submit">Login</button>
    </form>
  );
};

export default Login;
```

Explanation:

1. Import React and useState from the 'react' library.
2. Create a functional component called `Login`.
3. Use the `useState` hook to create two state variables, `email` and `password`, and their respective setter functions, `setEmail` and `setPassword`.
4. Create a `handleSubmit` function that will be called when the form is submitted. This function prevents the default form submission behavior and logs the email and password to the console. In a real-world application, you would replace this with your login logic, such as sending a request to your backend.
5. Return a form element with two input fields for email and password, and a submit button. The input fields are controlled components, meaning their values are controlled by the state variables (`email` and `password`), and their `onChange` event handlers update the state variables accordingly.
6. Export the `Login` component for use in other parts of your application.