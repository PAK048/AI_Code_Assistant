

Here's a simple login component using React and React Router for navigation. This example assumes you have a backend API for user authentication.

First, make sure you have the following dependencies installed:

```bash
npm install react react-dom react-router-dom axios
```

Now, create a new file `Login.js` and add the following code:

```jsx
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import axios from 'axios';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const history = useHistory();

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await axios.post('/api/login', {
        email,
        password,
      });

      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        history.push('/dashboard');
      } else {
        alert('Invalid credentials');
      }
    } catch (error) {
      console.error(error);
      alert('An error occurred while logging in');
    }
  };

  return (
    <div className="login-container">
      <h2>Login</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Password</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit">Login</button>
      </form>
    </div>
  );
};

export default Login;
```

In this example, we're using the `useState` hook to manage the email and password state. The `useHistory` hook from `react-router-dom` is used to navigate to the dashboard after a successful login.

The `handleSubmit` function is an asynchronous function that sends a POST request to the `/api/login` endpoint with the email and password. If the login is successful, it stores the token in local storage and navigates to the dashboard. If there's an error, it displays an alert message.

To use this component in your application, import it and include it in your routes like this:

```jsx
import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Login from './Login';
import Dashboard from './Dashboard';

const App = () => {
  return (
    <Router>
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/dashboard" component={Dashboard} />
      </Switch>
    </Router>
  );
};

export default App;
```

In this example, we're using `react-router-dom` to create routes for the login and dashboard components. The `Login` component is rendered when the user navigates to the `/login` path, and the `Dashboard` component is rendered when the user navigates to the `/dashboard` path.

Don't forget to create a `Dashboard.js` component for the dashboard and style your components as needed.

To post this code on GitHub, create a new repository, add this `Login.js` file, and commit