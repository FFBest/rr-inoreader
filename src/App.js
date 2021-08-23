import React, { Component } from 'react';
import './App.css';
import Header from './components/headerComponent';
import Main from './components/mainComponent';
import Aside from './components/asideComponent';

class App extends Component {
  render() {
    return (
      <div className="App container">
        <Aside />
        <section className="container is-vertical">
          <Header />
          <Main />
        </section>
      </div>
    );
  }
}

export default App;
