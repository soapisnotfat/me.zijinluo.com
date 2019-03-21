import React, { Component } from 'react';
import About from '../components/about';
import Footer from '../components/footer';
import Nav from '../components/nav';

export default class Aboutpage extends Component<{}, {}> {
  render() {
    return (
      <div>
        <Nav />
        <About />
        <Footer />
      </div>
    );
  }
}
