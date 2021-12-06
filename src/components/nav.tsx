import React, { Component } from "react";
import { Link } from "react-router-dom";

class Nav extends Component<{}, {}> {
  render() {
    return (
      <nav id="nav-wrap">
        <ul id="nav" className="nav">
          <li className="current">
            <Link to="/">Home</Link>
          </li>
          <li>
            <Link to="/about">About</Link>
          </li>
          <li>
            <a href="/resume">Resume</a>
          </li>
        </ul>
      </nav>
    );
  }
}

export default Nav;
