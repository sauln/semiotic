import React from "react"
//import ReactDOM from 'react-dom'

//import MarkContext from './MarkContext'
import { hexToRgb } from "./svg/SvgHelper"

//import Rx from 'rxjs/Rx'

import PropTypes from "prop-types"

import { chuckCloseCanvasTransform } from "./canvas/basicCanvasEffects"

class VisualizationLayer extends React.PureComponent {
  static defaultProps = { position: [0, 0] }

  canvasDrawing = []

  state = {
    canvasDrawing: [],
    dataVersion: "",
    renderedElements: []
  }

  componentDidUpdate() {
    if (
      this.props.disableContext ||
      !this.props.canvasContext ||
      !this.canvasDrawing
    )
      return

    const size = [
      this.props.size[0] + this.props.margin.left + this.props.margin.right,
      this.props.size[1] + this.props.margin.top + this.props.margin.bottom
    ]

    const context = this.props.canvasContext.getContext("2d")
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, size[0], size[1])

    this.canvasDrawing.forEach(piece => {
      const style = piece.styleFn ? piece.styleFn(piece.d, piece.i) : "black"
      let fill = style.fill ? style.fill : "black"
      let stroke = style.stroke ? style.stroke : "black"
      fill = !style.fillOpacity
        ? fill
        : `rgba(${[...hexToRgb(fill), style.fillOpacity]})`
      stroke = !style.strokeOpacity
        ? stroke
        : `rgba(${[...hexToRgb(stroke), style.strokeOpacity]})`
      context.setTransform(1, 0, 0, 1, 0, 0)
      context.translate(...this.props.position)
      context.translate(piece.tx, piece.ty)
      context.fillStyle = fill
      context.strokeStyle = stroke
      context.lineWidth = style.strokeWidth ? style.strokeWidth : "black"

      if (
        piece.markProps.markType === "circle" ||
        (piece.markProps.markType === "rect" && piece.markProps.rx > 0)
      ) {
        let vizX = 0,
          vizY = 0,
          r = piece.markProps.r
        if (piece.markProps.width) {
          const halfWidth = piece.markProps.width / 2
          vizX = piece.markProps.x + halfWidth
          vizY = piece.markProps.y + halfWidth
          r = halfWidth
        }
        context.beginPath()
        context.arc(vizX, vizY, r, 0, 2 * Math.PI)
        context.fill()
        context.stroke()
      } else if (piece.markProps.markType === "rect") {
        context.fillRect(
          piece.markProps.x,
          piece.markProps.y,
          piece.markProps.width,
          piece.markProps.height
        )
        context.strokeRect(
          piece.markProps.x,
          piece.markProps.y,
          piece.markProps.width,
          piece.markProps.height
        )
      } else if (piece.markProps.markType === "path") {
        const p = new Path2D(piece.markProps.d)
        context.stroke(p)
        context.fill(p)
      } else {
        console.error("CURRENTLY UNSUPPORTED MARKTYPE FOR CANVAS RENDERING")
      }
    })
    context.setTransform(1, 0, 0, 1, 0, 0)

    if (this.props.canvasPostProcess === "chuckClose") {
      chuckCloseCanvasTransform(this.props.canvasContext, context, size)
    } else if (typeof this.props.canvasPostProcess === "function") {
      this.props.canvasPostProcess(this.props.canvasContext, context, size)
    }
  }

  componentWillReceiveProps(np) {
    const lp = this.props
    const propKeys = Object.keys(np)

    let update = false
    propKeys.forEach(key => {
      if (lp[key] !== np[key]) {
        update = true
      }
    })

    if (
      update === true ||
      (np.dataVersion && np.dataVersion !== this.state.dataVersion)
    ) {
      const {
        xScale,
        yScale,
        dataVersion,
        projectedCoordinateNames,
        renderKeyFn,
        renderPipeline,
        baseMarkProps = {}
      } = np
      this.canvasDrawing = []
      const canvasDrawing = this.canvasDrawing

      const renderedElements = []
      Object.keys(renderPipeline).forEach(k => {
        const pipe = renderPipeline[k]
        if (
          (pipe.data &&
            typeof pipe.data === "object" &&
            !Array.isArray(pipe.data)) ||
          (pipe.data && pipe.data.length > 0)
        ) {
          const renderedPipe = pipe.behavior({
            xScale,
            yScale,
            canvasDrawing,
            projectedCoordinateNames,
            renderKeyFn,
            baseMarkProps,
            ...pipe
          })

          if (renderedPipe && renderedPipe.length > 0) {
            renderedElements.push(
              <g key={k} className={k}>
                {renderedPipe}
              </g>
            )
          }
        }
      })

      this.setState({
        renderedElements,
        dataVersion
      })
    }
  }

  render() {
    const props = this.props
    const { matte, matteClip, axes, axesTickLines, frameKey, position } = props
    const { renderedElements } = this.state

    const renderedAxes = axes && (
      <g key="visualization-axis-labels" className="axis axis-labels">
        {axes}
      </g>
    )
    const renderedAxesTickLines = axesTickLines && (
      <g key="visualization-tick-lines" className="axis axis-tick-lines">
        {axesTickLines}
      </g>
    )
    const renderedDataVisualization = renderedElements &&
      renderedElements.length > 0 && (
        <g
          className="data-visualization"
          key="visualization-clip-path"
          clipPath={
            matteClip && matte ? `url(#matte-clip${frameKey})` : undefined
          }
        >
          {renderedAxesTickLines}
          {renderedElements}
          {renderedAxes}
        </g>
      )

    const renderedVisualizationLayer = (renderedAxes ||
      renderedAxesTickLines ||
      renderedDataVisualization) && [
      renderedAxesTickLines,
      renderedDataVisualization,
      matte
    ]

    return renderedVisualizationLayer
  }
}

VisualizationLayer.propTypes = {
  axes: PropTypes.oneOfType([PropTypes.array, PropTypes.object]),
  frameKey: PropTypes.string,
  xScale: PropTypes.func,
  yScale: PropTypes.func,
  pointData: PropTypes.array,
  lineData: PropTypes.array,
  areaData: PropTypes.array,
  dataVersion: PropTypes.string,
  canvasContext: PropTypes.object,
  size: PropTypes.array
}

export default VisualizationLayer
