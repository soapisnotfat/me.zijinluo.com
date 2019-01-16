import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import NotFound from './pages/404/404';
import AboutPage from './pages/about';
import Home from './pages/home';
import info from './store/appInfo';
import './styles/default.scss';
import './styles/layout.scss';

class App extends Component {
  render() {
    return (
      <div className="App">
        <Switch>
          <Route exact path="/" component={Home} />
          <Route exact path="/about" component={AboutPage} />
          <Route
            path="/resume"
            component={() => (window.location = info.resume_url)}
          />
          <Route path="" component={NotFound} />
        </Switch>
      </div>
    );
  }
}

export default App;
