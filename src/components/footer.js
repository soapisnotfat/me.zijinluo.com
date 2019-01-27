import React, { Component } from 'react';
import info from '../store/appInfo';
import FacebookLink from './items/FacebookLink';
import GithubLink from './items/GithubLink';
import LinkedinLink from './items/LinkedinLink';

class Footer extends Component {
  render() {
    const currentTime = new Date(document.lastModified);
    return (
      <footer>
        <div className="row">
          <div className="twelve columns">
            <ul className="social-links">
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
            <ul className="copyright">
              <li>
                &copy;{' '}
                {`Copyright ${currentTime.getFullYear().toString()} @ ${
                  info.name
                }`}
              </li>
            </ul>
            <ul className="copyright">
              <li>{`Latest update on ${currentTime.getMonth() +
                1 +
                '/' +
                currentTime.getDate() +
                '/' +
                currentTime.getFullYear()}`}</li>
            </ul>
          </div>
        </div>
      </footer>
    );
  }
}

export default Footer;
