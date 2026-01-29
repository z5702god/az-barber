const React = require('react');

const Icon = (props) => React.createElement('Icon', props, props.children);
Icon.displayName = 'Icon';

module.exports = Icon;
module.exports.default = Icon;
