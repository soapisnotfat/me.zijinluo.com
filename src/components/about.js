import React, { Component } from 'react';
import { Particles } from 'react-particles-js';
import info from '../store/appInfo';

class EducationItem extends Component {
  render() {
    return (
      <div className="row item">
        <div className="twelve columns">
          <h3>{this.props.name}</h3>
          <p className="info">
            {this.props.description} <span>&bull;</span>{' '}
            <em className="date">{this.props.time}</em>
          </p>
        </div>
      </div>
    );
  }
}

class ExperienceItem extends Component {
  render() {
    return (
      <div className="row item">
        <div className="twelve columns">
          <h3>{this.props.name}</h3>
          <p className="info">
            {this.props.description} <span>&bull;</span>{' '}
            <em className="date">{this.props.time}</em>
          </p>
        </div>
      </div>
    );
  }
}

class About extends Component {
  getEducation() {
    return info.education.map((e, i) =>
      React.createElement(EducationItem, { ...e, key: i })
    );
  }

  getExperience() {
    return info.experience.map((e, i) =>
      React.createElement(ExperienceItem, { ...e, key: i })
    );
  }

  render() {
    return (
      <div>
        <section className="about">
          <Particles
            params={{
              particles: {
                number: {
                  value: 200,
                  density: {
                    enable: true
                  }
                },
                color: {
                  value: '#b3a369'
                },
                size: {
                  value: 4,
                  random: true,
                  anim: {
                    speed: 3,
                    size_min: 0.3
                  }
                },
                line_linked: {
                  enable: false
                },
                move: {
                  random: true,
                  speed: 1,
                  direction: 'top',
                  out_mode: 'out'
                }
              }
            }}
            className="particles"
          />
          <div className="row">
            <div className="three columns">
              <img className="profile-pic" src={info.avatar_url} alt="" />
            </div>

            <div className="nine columns main-col">
              <h2>About Me</h2>
              <p>{info.description}</p>
              <div className="row">
                <div className="columns contact-details">
                  <h2>Get In Touch</h2>
                  <p className="address">
                    <a href={`mailto:${info.contact_email}`}>
                      {info.contact_email
                        .replace('@', ' [at] ')
                        .replace('.', ' [dot] ')}
                    </a>
                  </p>
                </div>
                <div className="columns download">
                  <p>
                    <a
                      href={info.resume_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button"
                    >
                      <i className="fa fa-download" />
                      View My Resume
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="experience">
          <div className="row education">
            <div className="three columns header-col">
              <h1>
                <span>Education</span>
              </h1>
            </div>
            <div className="nine columns main-col">{this.getEducation()}</div>
          </div>

          <div className="row work">
            <div className="three columns header-col">
              <h1>
                <span>Experiences</span>
              </h1>
            </div>
            <div className="nine columns main-col">{this.getExperience()}</div>
          </div>
        </div>
      </div>
    );
  }
}

export default About;
