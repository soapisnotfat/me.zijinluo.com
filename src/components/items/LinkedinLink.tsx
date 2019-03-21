import React, { Component } from 'react';
import info from '../../store/appInfo';

class LinkedinLink extends Component<{}, {}> {
  render() {
    return (
      <a href={info.linkedin_url} target='_blank' rel='noopener noreferrer'>
        <i className='fa fa-linkedin' />
      </a>
    );
  }
}

export default LinkedinLink;
