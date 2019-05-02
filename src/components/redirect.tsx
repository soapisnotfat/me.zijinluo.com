import { Component } from 'react';

type curProps = {
  target: string;
};

export class Redirect extends Component<curProps, {}> {
  componentWillMount() {
    window.location.href = this.props.target;
  }
  render() {
    return null;
  }
}

export default Redirect;
