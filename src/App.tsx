import { Component } from "react";
import { Route, Routes } from "react-router-dom";
import NotFound from "./pages/404/404";
import AboutPage from "./pages/about";
import Home from "./pages/home";
import info from "./store/appInfo";
import "./styles/default.scss";
import "./styles/layout.scss";
import Redirect from "./components/redirect";

export default class App extends Component<{}, {}> {
  render() {
    return (
      <div className="App">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/resume"
            element={<Redirect target={info.resume_url} />}
          />
          <Route path="" element={<NotFound />} />
        </Routes>
      </div>
    );
  }
}
