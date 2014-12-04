define (require) ->
  d3 = require 'd3'
  Signals = require 'Signal'
  Utils = require 'cs!core/Utils'

  class Properties
    constructor: (@timeline) ->
      @onKeyAdded = new Signals.Signal()
      @subGrp = false

    render: (bar) ->
      self = this

      propVal = (d,i) -> if d.properties then d.properties else []
      propKey = (d) -> d.name
      visibleProperties = (d) -> d.keys.length

      properties = bar.selectAll('.line-item').data(propVal, propKey)

      dy = 0
      subGrp = properties.enter()
        .append('g')
        .filter(visibleProperties)
        .attr("class", 'line-item')

      # Save subGrp in a variable for use in Errors.coffee
      self.subGrp = subGrp

      properties.filter(visibleProperties)
        .attr "transform", (d, i) ->
          sub_height = (i + 1) * self.timeline.lineHeight
          return "translate(0," + sub_height + ")"

      subGrp.append('rect')
        .attr('class', 'click-handler click-handler--property')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', self.timeline.x(self.timeline.timer.totalDuration + 100))
        .attr('height', self.timeline.lineHeight)
        .on 'dblclick', (d) ->
          lineObject = this.parentNode.parentNode
          lineValue = d3.select(lineObject).datum()
          def = if d.default then d.default else 0
          mouse = d3.mouse(this)
          dx = self.timeline.x.invert(mouse[0])
          dx = dx.getTime() / 1000
          prevKey = Utils.getPreviousKey(d.keys, dx)
          # set the value to match the previous key if we found one
          if prevKey then def = prevKey.val
          newKey = {time: dx, val: def}
          d.keys.push(newKey)
          # Sort the keys for tweens creation
          d.keys = Utils.sortKeys(d.keys)

          lineValue._isDirty = true
          keyContainer = this.parentNode
          self.onKeyAdded.dispatch(newKey, keyContainer)

      # Mask
      subGrp.append('svg')
        .attr('class','line-item__keys timeline__right-mask')
        .attr('width', window.innerWidth - self.timeline.label_position_x)
        .attr('height', self.timeline.lineHeight)
        .attr('fill', '#f00')

      subGrp.append('text')
        .attr("class", "line-label line-label--small")
        .attr("x", self.timeline.label_position_x + 10)
        .attr("y", 15)
        .text (d) ->
          d.name

      subGrp.append("line")
        .attr("class", 'line-separator--secondary')
        .attr("x1", -self.timeline.margin.left)
        .attr("x2", self.timeline.x(self.timeline.timer.totalDuration + 100))
        .attr("y1", self.timeline.lineHeight)
        .attr("y2", self.timeline.lineHeight)

      bar.selectAll('.line-item').attr('display', (d) ->
          lineObject = this.parentNode
          lineValue = d3.select(lineObject).datum()
          return if !lineValue.collapsed then "block" else "none"
        )

      return properties