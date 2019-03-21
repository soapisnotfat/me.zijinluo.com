import React, { Component } from 'react';
import { Route, Switch } from 'react-router-dom';
import NotFound from './pages/404/404';
import AboutPage from './pages/about';
import Home from './pages/home';
import info from './store/appInfo';
import './styles/default.scss';
import './styles/layout.scss';
import Redirect from './components/redirect';

class App extends Component<{}, {}> {
  render() {
    return (
      <div className='App'>
        <Switch>
          <Route exact path='/' component={Home} />
          <Route exact path='/about' component={AboutPage} />
          <Route
            path='/resume'
            render={routeProps => (
              <Redirect {...routeProps} target={info.resume_url} />
            )}
          />
          <Route
            path='/project'
            render={routeProps => (
              <Redirect {...routeProps} target={info.project_url} />
            )}
          />
          <Route path='' component={NotFound} />
        </Switch>
      </div>
    );
  }
}
export default App;
