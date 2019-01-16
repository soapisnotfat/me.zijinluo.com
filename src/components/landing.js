import React, { Component } from 'react';
import { Link } from 'react-router-dom';
import info from '../store/appInfo';
import FacebookLink from './items/FacebookLink';
import GithubLink from './items/GithubLink';
import LinkedinLink from './items/LinkedinLink';
import Nav from './nav';

class Landing extends Component {
  render() {
    return (
      <header>
        <Nav />
        <div className="row banner">
          <img className="profile-pic" src={info.avatar_url} alt="" />
          <div className="landing-text">
            <h1 className="responsive-headline">
              <Link to="/about">{`I'm ${info.name.split(' ')[0]}`}</Link>
            </h1>
            <hr />
            <h3>Software Engineer · ML/CV Researcher · Web Dev</h3>
            <ul className="social">
              <li>
                <FacebookLink />
              </li>
              <li>
                <LinkedinLink />
              </li>
              <li>
                <GithubLink />
              </li>
            </ul>
          </div>
        </div>
      </header>
    );
  }
}

export default Landing;
