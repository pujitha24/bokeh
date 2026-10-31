import {BaseColorBar, BaseColorBarView} from "./base_color_bar"
import type {TickFormatter} from "../formatters/tick_formatter"
import {LogTickFormatter} from "../formatters"
import type {DisplayExtent} from "../mappers/color_mapper"
import {ColorMapper, palette_to_rgba} from "../mappers/color_mapper"
import type {Range} from "../ranges"
import {Range1d} from "../ranges"
import type {Scale} from "../scales"
import {LinearInterpolationScale} from "../scales"
import type {Ticker} from "../tickers/ticker"
import {LogTicker} from "../tickers"
import type * as p from "core/properties"
import {reversed} from "core/util/array"
import type {BBox} from "core/util/bbox"
import type {Context2d} from "core/util/canvas"

export class ColorBarView extends BaseColorBarView {
  declare model: ColorBar

  protected _image: HTMLCanvasElement | null

  // Indices of displayed colors corresponding to low and high display cutoffs.
  protected _index_low: number | null
  protected _index_high: number | null

  override connect_signals(): void {
    super.connect_signals()
    this.connect(this.model.properties.color_mapper.change, async () => {
      this._title_view.remove()
      this._axis_view.remove()
      this.initialize()
      await this.lazy_initialize()
      this.plot_view.invalidate_layout()
    })
    this.connect(this.model.color_mapper.metrics_change, () => this._metrics_changed())
    this.connect(this.model.properties.display_low.change, () => this._metrics_changed())
    this.connect(this.model.properties.display_high.change, () => this._metrics_changed())
  }

  get color_mapper(): ColorMapper {
    // Color mapper that is used to render this colorbar.
    return this.model.color_mapper.display_mapper
  }

  override update_layout(): void {
    super.update_layout()

    this._set_canvas_image()
  }

  override _create_formatter(): TickFormatter {
    if (this._ticker instanceof LogTicker) {
      return LogTickFormatter.create()
    } else {
      return this.color_mapper.create_formatter()
    }
  }

  override _create_major_range(): Range {
    /*
    Creates and returns a scale instance that maps the `color_mapper` range
    (low to high) to a screen space range equal to the length of the ColorBar's
    scale image. The scale is used to calculate the tick coordinates in screen
    coordinates for plotting purposes.

    Note: the type of color_mapper has to match the type of scale (i.e.
    a LinearColorMapper will require a corresponding LinearScale instance).
    */
    return this.color_mapper.create_range(this._display_extent())
  }

  override _create_major_scale(): Scale {
    return this.color_mapper.create_scale(this._display_extent())
  }

  override _create_ticker(): Ticker {
    return this.color_mapper.create_ticker()
  }

  // Return the displayed extent of the color mapper, accounting for low and
  // high display cutoffs.
  protected _display_extent(): DisplayExtent {
    const {display_low, display_high} = this.model
    const extent = this.color_mapper.display_extent(display_low, display_high)
    this._index_low = extent.index_low
    this._index_high = extent.index_high
    return extent
  }

  override _get_major_size_factor(): number | null {
    return this.color_mapper.palette.length
  }

  protected _metrics_changed(): void {
    const range = this._major_range
    const scale = this._major_scale

    const {start, end, binning} = this._display_extent()

    if (binning != null && scale instanceof LinearInterpolationScale) {
      scale.binning = binning

      // Update the frame's LinearInterpolationScale and Range1d as they are
      // different objects to this._major_scale and this._major_range.
      const vertical = this.orientation == "vertical"
      const frame_scale = vertical ? this._frame_view.y_scale : this._frame_view.x_scale
      if (frame_scale instanceof LinearInterpolationScale) {
        frame_scale.binning = binning

        const frame_range = vertical ? this._frame_view.y_range : this._frame_view.x_range
        if (frame_range instanceof Range1d) {
          frame_range.start = binning[0]
          frame_range.end = binning[binning.length-1]
        }
      }
    } else if (start != null && end != null && range instanceof Range1d) {
      range.setv({start, end})
    }

    this._set_canvas_image()
    this.plot_view.request_layout() // this.request_paint()
  }

  override _paint_colors(ctx: Context2d, bbox: BBox): void {
    const {x, y, width, height} = bbox
    ctx.save()
    ctx.globalAlpha = this.model.scale_alpha
    if (this._image != null) {
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(this._image, x, y, width, height)
    }
    if (this.visuals.bar_line.doit) {
      this.visuals.bar_line.set_value(ctx)
      ctx.strokeRect(x, y, width, height)
    }
    ctx.restore()
  }

  protected _set_canvas_image(): void {
    const {orientation} = this

    let {palette} = this.color_mapper

    if (this._index_high != null || this._index_low != null) {
      palette = palette.slice(
        this._index_low != null ? this._index_low : 0,
        this._index_high != null ? this._index_high + 1 : palette.length)
    }

    if (palette.length < 1) {
      // Early exit for empty color bar.
      this._image = null
      return
    }

    if (orientation == "vertical") {
      palette = reversed(palette)
    }

    const [w, h] = (() => {
      if (orientation == "vertical") {
        return [1, palette.length]
      } else {
        return [palette.length, 1]
      }
    })()

    const canvas = this._image = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const image_ctx = canvas.getContext("2d")!
    const image_data = image_ctx.getImageData(0, 0, w, h)

    image_data.data.set(palette_to_rgba(palette))
    image_ctx.putImageData(image_data, 0, 0)
  }
}

export namespace ColorBar {
  export type Attrs = p.AttrsOf<Props>

  export type Props = BaseColorBar.Props & {
    color_mapper: p.Property<ColorMapper>
    display_low: p.Property<number | null>
    display_high: p.Property<number | null>
    scale_alpha: p.Property<number>
  }
}

export interface ColorBar extends ColorBar.Attrs {}

export class ColorBar extends BaseColorBar {
  declare properties: ColorBar.Props
  declare __view_type__: ColorBarView

  static {
    this.prototype.default_view = ColorBarView

    this.define<ColorBar.Props>(({Alpha, Nullable, Float, Ref}) => ({
      color_mapper: [ Ref(ColorMapper) ],
      display_low:  [ Nullable(Float), null ],
      display_high: [ Nullable(Float), null ],
      scale_alpha:  [ Alpha, 1.0 ],
    }))
  }
}
