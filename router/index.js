import React, { PropTypes } from 'react'
import { Dimensions, Animated, Easing, StyleSheet, View } from "react-native";
import BrowserNavContainer from "./browser-nav-container";
import ServerNavContainer from "./server-nav-container";
import Navigation, { addNavigationHelpers } from 'react-navigation/lib/react-navigation.web.js'

let reactAppContext = {};
let isNodeRuntime = false
let matchToRoute

const AnimateValue = (v) => new Animated.Value(v);

/**
 * 简单实现切换路由时页面切换，以后这里可以写个动画进行页面切换
 */
class NavAnimateView extends React.Component {

  static propTypes = {
    route: PropTypes.string,
    isForward: PropTypes.bool
  }

  constructor(props) {
    super(props);
    this.state = {};
  }

  /**
  * 初始化动画参数
  */
  initAnimation(isForward) {
    const screenWidth = Dimensions.get('window').width;
    this.beginX = 0;
    this.endX = isForward ? screenWidth : -screenWidth;
    this.translateX = AnimateValue(0);
    this.translateZ = AnimateValue(0);
    //注册的动画
    this.createAnimations = {
      getInAnimate: this.inAnimation.bind(this),
      getOutAnimate: this.outAnimation.bind(this),
    }
  }

  /**
  * 获取进入页面动画样式
  */
  getPageInStyle(isForward) {
    let animateStyle = { backfaceVisibility: 'hidden','willChange':'transform','perspective':1000 }
    let transXInterpolate = this.translateX.interpolate({
      inputRange: [0, 1],
      outputRange: [this.endX, this.beginX]
    });
    animateStyle.transform = [{ translate3d: '0,0,0' }, { translateX: transXInterpolate }];
    return animateStyle;
  }

   /**
    * 初始化进入页面动画样式
    */
  getPageOutStyle(state) {
    let outStyle = { backfaceVisibility: 'hidden','willChange':'transform','perspective':1000 }
    let transZInterpolate = this.translateZ.interpolate({
      inputRange: [0, 1],
      outputRange: [0,-300]
    });
    outStyle.transform = [{ translate3d: '0,0,0' }, { translateZ: transZInterpolate }];
    return outStyle;
  }

  /**
   * 播放动画
   */
  playAnimation() {
    this.createAnimations.getInAnimate().start();
    if (this.state.lastChildren) {
      this.createAnimations.getOutAnimate().start(()=>{
        this.setState({lastChildren:undefined})
      });
    }
  }

  inAnimation() {
    return Animated.timing(this.translateX, { toValue: 1, duration: 280, easing: Easing.linear });
  }

  outAnimation() {
    return Animated.timing(this.translateZ, { toValue: 1, duration: 280, easing: Easing.linear });
  }

  _shouldSetResponder() {
    return true;
  }

  /**
   * 当属性改变时,切换窗口样式
   */
  componentWillReceiveProps(nextProps) {
    if (nextProps.route !== this.props.route) {
      this.initAnimation(nextProps.isForward);
      this.setState({
        lastChildren: this.props.children,
        initStyle: this.getPageInStyle(),
        outStyle:this.getPageOutStyle()
      })
    }
  }

  /**
 * 当属性改变时,切换窗口样式
 */
  componentDidUpdate(nextProps) {
    this.playAnimation();
  }

  /**
   * 渲染切换前的视图
   */
  renderPrev() {
    let { lastChildren } = this.state;
    if (lastChildren) {
      return (
        <Animated.View style={[styles.nav, this.state.outStyle]} onStartShouldSetResponder={this._shouldSetResponder.bind(this)}>
          {lastChildren}
        </Animated.View>
      )
    }
  }

  /**
   * 渲染组件
   */
  render() {
    return (
      <View style={styles.container}>
        {this.renderPrev()}
        <Animated.View style={[styles.nav, this.state.initStyle]} onStartShouldSetResponder={this._shouldSetResponder.bind(this)}>
          {this.props.children}
        </Animated.View>
      </View>
    );
  }
}

const NavView = ({ navigation, router, isForward }) => {
  const { state } = navigation;
  const Component = router.getComponentForState(state);
  const { path } = router.getPathAndParamsForState(state);
  isForward = isForward || false;
  return (
    <NavAnimateView route={path} isForward={isForward}>
      <Component
        navigation={addNavigationHelpers({
          ...navigation,
          state: state.routes[state.index],
        })}
      />
    </NavAnimateView>
  );
};

/**
 * 由于react-navigation 在web平台下只能使用TabRouter以及StackRouter 
 * 这里为了统一风格，追加StackNavigator 
 * 用于兼容web平台路由定义，并且根据运行环境(客户端/服务端)
 * 返回对应的Navigator
 * 服务端：createNavigator
 * 客户端:BrowserNavContainer(createNavigator(...)) 模式
 * BrowserNavContainer：用于实现客户端采用pushState切换页面，
 *                      完成同构衔接(既可以客户端跳转(pushState)也可以刷新浏览器服务器渲染)
 */
Navigation.StackNavigator = (routeConfigs, stackConfig) => {
  let { TabRouter, createNavigator } = Navigation;
  let navigator = createNavigator(TabRouter(routeConfigs, stackConfig))(NavView);
  let { router } = navigator;
  let NavContainer = isNodeRuntime ? ServerNavContainer : BrowserNavContainer;
  navigator = NavContainer(navigator, matchToRoute);
  navigator.router = router;
  navigator.initialRouteName = reactAppContext.route;
  return navigator;
}

Navigation.setConfig = function (config) {
  reactAppContext = config.reactAppContext
  isNodeRuntime = config.isNodeRuntime
  matchToRoute = config.matchToRoute
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nav: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    backgroundColor: '#fff',
  }
});

export default module.exports = Navigation;