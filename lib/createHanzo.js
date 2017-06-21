import invariant from 'invariant';
import warning from 'warning';
import isPlainObject from 'is-plain-object';
import React, { Component } from 'react'
import { createStore, applyMiddleware, compose, combineReducers } from 'redux'
import { addNavigationHelpers, StackNavigator } from 'react-navigation';
import { Provider, connect } from 'react-redux'
import { handleAction, handleActions } from 'redux-actions'
import deepmerge from 'deepmerge'
import Plugin from './plugin';
import GlobalContext from './global'

export default function createHanzo(createOpts) {
  const {
    mobile,
    initialReducer,
    defaultHistory,
    routerMiddleware,
    setupHistory,
  } = createOpts;

  return function hanzo(hooks = {}) {
    const history = hooks.history || defaultHistory;
    const initialState = hooks.initialState || {};
    delete hooks.history;
    delete hooks.initialState;

    const plugin = new Plugin();

    const app = {
      // properties
      _models: [],
      _reducers: {},
      _views: {},
      _router: null,
      _routerProps: {},
      _routes: null,
      _store: null,
      _history: null,
      _isomorphic: hooks.isomorphic || false,

      // methods
      use,
      registerModule,
      router,
      start,
      getStore,
      getRoutes,
      getModule,
    };

    return app

    /***********************************
    /* Methods
    /***********************************

    /**
     * Register an object of hooks on the application.
     *
     * @param hooks
     */
    function use(hooks) {
      plugin.use(hooks);
    }

    /**
     * Register a module
     *
     * @param module
     */
    function registerModule(module) {
      this._models.push(module.models)
      this._views = {
        ...this._views,
        ...module.views
      }

      if(isPlainObject(module.models)) {
        let Actions = {}
        let namespace = module.models.namespace.replace(/\/$/g, '');
        Object.keys(module.models.reducers).map((key) => {
          if(key.indexOf('REACT_NATIVE_ROUTER_FLUX') !== -1) {
            Actions[key] = module.models.reducers[key];
          } else if(key.startsWith('/')) {
            Actions[key.substr(1)] = module.models.reducers[key];
          } else {
            Actions[namespace + '/' + key] = module.models.reducers[key];
          }
        })
        let _temp = handleActions(Actions, module.models.state)
        let _arr = namespace.split('/')
        _genObject(this._reducers, _arr, _temp)
      }

      if(module.publicHandlers && Array.isArray(module.publicHandlers)) {
        module.publicHandlers.map((item) => {
          GlobalContext.registerHandler(namespace.replace(/\//g, '.') + '.' + item.name, item.action)
        })
      }
    }

    function _genObject(obj, arr, res) {
      if(arr.length > 1) {
        let hierachy = arr.splice(0,1)[0]
        obj[hierachy] = obj[hierachy] || {}
        _genObject(obj[hierachy], arr, res)
      } else {
        obj[arr[0]] =  res || {}
      }
    }

    function router(router, props) {
      this._router = router(this._views)
      this._routerProps = props || {}
    }

    function start(container) {
      if (typeof container === 'string') {
        container = document.querySelector(container);
      }
      // setup history
      if (setupHistory) setupHistory.call(this, history);

      if(mobile) {
        const me = this
        const AppNavigator = me._router;
        let store = getStore.call(me, AppNavigator)
        const isomorphic = me._isomorphic
        const App = ({ dispatch, nav }) => (
          <AppNavigator navigation={addNavigationHelpers({ dispatch, state: nav })} />
        );
        const mapStateToProps = state => ({
          nav: state.nav,
        });

        const AppWithNavigationState = connect(mapStateToProps)(App);

        return class extends Component {
          render() {
            isomorphic ? store = getStore.call(me, AppNavigator) : null
            return (
              <Provider store={store}>
                <AppWithNavigationState />
              </Provider>
            ) 
          }
        } 
      }
    }

    function getModule(name) {
      return this._views[name]
    }

    function getStore(AppNavigator) {
      let middlewares = plugin.get('onAction');

      if(!mobile) {
        middlewares.push(routerMiddleware(history))
      }

      // extra reducers
      const extraReducers = plugin.get('extraReducers');

      let enhancer = applyMiddleware(...middlewares)
      if (typeof __DEV__ !== 'undefined' && __DEV__) {
        const devTools = plugin.get('dev') || ((noop) => noop)
        if(devTools.apply) {
          enhancer = compose(
            applyMiddleware(...middlewares),
            devTools
          )
        }
      }

      const createAppStore = enhancer(createStore);
      const mergeReducers = deepmerge.all([this._reducers, extraReducers])
      for(let k in mergeReducers) {
        if(typeof mergeReducers[k] === 'object') {
          mergeReducers[k] = combineReducers(mergeReducers[k])
        }
      }

      const navInitialState = AppNavigator.router.getStateForAction(
        AppNavigator.router.getActionForPathAndParams(this._router.initialRouteName)
      );

      const navReducer = (state = navInitialState, action) => {
        const nextState = AppNavigator.router.getStateForAction(action, state);

        // Simply return the original `state` if `nextState` is null or undefined.
        return nextState || state;
      };

      const appReducer = combineReducers({
        nav: navReducer,
        ...initialReducer,
        ...mergeReducers,
      });

      this._store = Object.assign(this._store || {}, createAppStore(appReducer, initialState));
      return this._store
    }

    function getRoutes() {
      return this._routes
    }

    ////////////////////////////////////
    // Helpers

    function getProvider(store, app, scenes) {
      let { onUpdate } = app._routerProps
      let Router = require('../router').Router      
      return () => (
        <Provider store={store}>
          <Router history={app._history} {...app._routerProps} onUpdate={function() {return onUpdate && onUpdate.call(this, app._store)}}>
            { scenes }
          </Router>
        </Provider>
      );
    }

    function render(container, store, app, scenes) {
      const ReactDOM = require('react-dom');
      ReactDOM.render(React.createElement(getProvider(store, app, scenes)), container);
    }
  }
}
