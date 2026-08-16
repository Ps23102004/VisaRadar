(function(root, factory){
  if (typeof module === 'object' && module.exports){
    module.exports = factory();
  } else {
    root.VisaRadarState = factory();
  }
})(typeof self !== 'undefined' ? self : this, function(){

  function createState(initial){
    var state = Object.assign({}, initial);
    var listeners = [];

    function get(){ return state; }

    function set(partial){
      state = Object.assign({}, state, partial);
      listeners.forEach(function(fn){ fn(state); });
    }

    function subscribe(fn){
      listeners.push(fn);
      return function unsubscribe(){
        var idx = listeners.indexOf(fn);
        if (idx !== -1) listeners.splice(idx, 1);
      };
    }

    return { get: get, set: set, subscribe: subscribe };
  }

  return { createState: createState };
});
