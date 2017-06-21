import { browserHistory } from 'react-router'
import {
  routerMiddleware,
  syncHistoryWithStore,
  routerReducer as routing
} from 'react-router-redux';
import createHanzo from './createHanzo';

export default createHanzo({
  mobile: false,
  initialReducer: {
    routing,
  },
  defaultHistory: browserHistory,
  routerMiddleware: routerMiddleware,

  setupHistory(history) {
    this._history = syncHistoryWithStore(history, this._store);
  },
});