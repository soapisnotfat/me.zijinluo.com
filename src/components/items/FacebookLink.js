import React, { Component } from 'react';

import info from '../../store/appInfo';

class FacebookLink extends Component {
  render() {
    return (
      <a href={info.facebook_url} target="=_blank" rel="noopener noreferrer">
        <i className="fa fa-facebook" />
      </a>
    );
  }
}

export default FacebookLink;
