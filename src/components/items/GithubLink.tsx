import React, { Component } from 'react';
import info from '../../store/appInfo';

class GithubLink extends Component<{}, {}> {
  render() {
    return (
      <a href={info.github_url} target='_blank' rel='noopener noreferrer'>
        <i className='fa fa-github' />
      </a>
    );
  }
}

export default GithubLink;
