let d3 = require('d3');
let Signals = require('js-signals');
import Utils from '../core/Utils';

// https://github.com/hnakamur/d3.js-drag-bezier-curves-example/blob/master/app/index.js
// http://greensock.com/forums/topic/7921-translating-css-cubic-bezier-easing-to-gsap/
// https://github.com/gre/bezier-easing
// https://matthewlein.com/ceaser/

export default class PropertyCurveEdit {
  constructor(timeline, container) {
    this.timeline = timeline;
    this.container = container;
    this.dy = 10 + this.timeline.margin.top;
  }

  normalizeVal(val, min, max, min2, max2) {
    const diff = max - min;
    const diff2 = max2 - min2;
    const t = (val - min) / diff;
    return min2 + t * diff2;
  }

  // Get bezier point from easing (0 to 1) and previous and next point.
  bezierPoint(pt, prev, next) {
    const x = this.normalizeVal(pt.x, 0, 1, prev.x, next.x);
    const y = this.normalizeVal(pt.y, 0, 1, prev.y, next.y);
    return {x, y};
  }

  // Transform an array of points to a SVG bezier path.
  getPath(points) {
    // Path first start by Move command (absolute);
    let p = `M ${points[0].x} ${points[0].y}`;
    // Then it's C a.x a.y, b.x b.y, c.x x.y
    points.forEach((pt, i) => {
      // Drop first one since already in 'M' command above.
      if (i > 0) {
        p += ', ';
        if ((i - 1) % 3 === 0) {
          p += 'C ';
        }
        p += `${pt.x} ${pt.y}`;
      }
    });
    return p;
  }

  processCurveValues(d) {
    const MAX_HEIGHT = 120;
    if (d.keys.length <= 1) {
      return [];
    }
    // preprocess min and max for keys.
    d._min = d3.min(d.keys, (k) => k.val);
    d._max = d3.max(d.keys, (k) => k.val);

    d._curvePoints = [];
    // set raw points, without bezier control yet.
    d.keys.forEach((key) => {
      const x = this.timeline.x(key.time * 1000);
      const y = this.normalizeVal(key.val, d._min, d._max, 0, MAX_HEIGHT);
      d._curvePoints.push({x, y, ease: key.ease});
    });

    // Add all points, with controls bezier. (p1, bezier1, bezier2, p2, …).
    d._curvePointsBezier = [];
    d._curvePoints.forEach((pt, i) => {
      const next = d._curvePoints[i + 1];
      d._curvePointsBezier.push({x: pt.x, y: pt.y, ease: pt.ease});
      if (next) {
        const easing = Utils.getEasingPoints(next.ease);
        const p1 = this.bezierPoint({x: easing[0], y: easing[1]}, pt, next);
        const p2 = this.bezierPoint({x: easing[2], y: easing[3]}, pt, next);
        d._curvePointsBezier.push(p1);
        d._curvePointsBezier.push(p2);
      }
    });

    const path = this.getPath(d._curvePointsBezier);
    return [{points: d._curvePoints, path, name: d.name}];
  }

  render() {
    const self = this;
    const tweenTime = self.timeline.tweenTime;

    var bar = this.container.selectAll('.curve-grp')
      .data(this.timeline.tweenTime.data, (d) => {return d.id;});

    var barEnter = bar.enter()
      .append('g').attr('class', 'curve-grp');

    var propVal1 = function(d) {
      if (d.properties) {
        return d.properties;
      }

      return [];
    };
    var propKey1 = function(d) {
      return d.name;
    };

    var properties = bar.selectAll('.curves-preview').data(propVal1, propKey1);

    properties.enter()
      .append('svg')
      .attr('class', 'curves-preview timeline__right-mask')
      .attr('width', window.innerWidth - self.timeline.label_position_x)
      .attr('height', 300);

    var curveKey = (d) => {
      return d.name;
    };
    var curves = properties.selectAll('.curve')
      .data((d) => this.processCurveValues(d), curveKey);

    curves.enter()
      .append('path')
      .attr({
        class: 'curve',
        fill: 'none',
        stroke: '#fff'
      });

    curves.attr('d', (d) => d.path);

    curves.exit().remove();
  }
}
