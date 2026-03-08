import { Component } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/globals.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null, stack: '' }; }
  static getDerivedStateFromError(e) { return { err: e }; }
  componentDidCatch(e, i) { this.setState({ stack: i?.componentStack || '' }); }
  render() {
    if (this.state.err) return (
      <div style={{padding:24,color:'#ff6b6b',fontFamily:'monospace',background:'#07070f',height:'100vh',overflow:'auto'}}>
        <b style={{fontSize:14}}>Error: {this.state.err.message}</b>
        <pre style={{fontSize:11,color:'#fbbf24',marginTop:12,whiteSpace:'pre-wrap'}}>{this.state.stack}</pre>
      </div>
    );
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
)
