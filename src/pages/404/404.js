import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import './404.css';

class NotFound extends Component {
  componentDidMount() {
    document.title = 'ooops 404';
  }

  render() {
    return (
      <div className="error-container">
        <h1>404</h1>
        <h3>Your Access Is Denied</h3>
        <p className="return">
          Take me back to <Link to="/">mE.zIjInLuO.cOm</Link>
        </p>
      </div>
    );
  }
}

export default NotFound;
