import {Mapper} from "./mapper"
import type {Factor} from "../ranges/factor_range"
import type {TickFormatter} from "../formatters/tick_formatter"
import {BasicTickFormatter} from "../formatters/basic_tick_formatter"
import type {Range} from "../ranges/range"
import type {Scale} from "../scales/scale"
import type {Ticker} from "../tickers/ticker"
import {BasicTicker} from "../tickers/basic_ticker"
import type * as p from "core/properties"
import {Signal0} from "core/signaling"
import type {Arrayable, Color, uint32, RGBAArray} from "core/types"
import {ColorArray} from "core/types"
import {unreachable} from "core/util/assert"
import {color2rgba, encode_rgba} from "core/util/color"
import {to_big_endian} from "core/util/platform"
import type {NDArrayType} from "core/util/ndarray"
import {is_NDArray, Uint32NDArray} from "core/util/ndarray"

export interface RGBAMapper {
  v_compute(xs: Arrayable<number> | NDArrayType<number> | Arrayable<Factor> | NDArrayType<Factor>): RGBAArray
}

export function convert_to_uint32_color(color: Color): uint32 {
  return encode_rgba(color2rgba(color))
}

export function convert_to_uint32_palette(palette: Color[]): Uint32Array {
  const new_palette = new Uint32Array(palette.length)
  for (let i = 0, end = palette.length; i < end; i++) {
    new_palette[i] = convert_to_uint32_color(palette[i])
  }
  return new_palette
}

// Converts a palette to RGBA bytes, one color per pixel, in palette order.
export function palette_to_rgba(palette: Color[]): RGBAArray {
  const values = convert_to_uint32_palette(palette)
  to_big_endian(values)
  return new Uint8ClampedArray(values.buffer)
}

// The part of a mapper that is displayed, given low and high display cutoffs.
// `index_low` and `index_high` are indices of the first and the last displayed
// colors, or `null` if the palette isn't cut off on that side.
export type DisplayExtent = {
  index_low: number | null
  index_high: number | null
  start?: number
  end?: number
  binning?: Arrayable<number>
}

export namespace ColorMapper {
  export type Attrs = p.AttrsOf<Props>

  export type Props = Mapper.Props & {
    palette: p.Property<Color[]>
    nan_color: p.Property<Color>
  }
}

export interface ColorMapper extends ColorMapper.Attrs {}

export abstract class ColorMapper extends Mapper<Color> {
  declare properties: ColorMapper.Props

  readonly metrics_change: Signal0<this> = new Signal0(this, "metrics_change")

  static {
    this.define<ColorMapper.Props>(({Color, List}) => ({
      palette:   [ List(Color) ],
      nan_color: [ Color, "gray" ],
    }))
  }

  v_compute(xs: Arrayable<number> | Arrayable<Factor | number | null>): Arrayable<Color> {
    const values: ColorArray = new Uint32Array(xs.length)
    this._v_compute(xs, values, convert_to_uint32_palette(this.palette), this._colors(convert_to_uint32_color))
    return new Uint32NDArray(values)
  }

  get rgba_mapper(): RGBAMapper {
    const self = this
    const palette = convert_to_uint32_palette(this.palette)
    const colors = this._colors(convert_to_uint32_color)
    return {
      v_compute(xs) {
        const length_divisor = is_NDArray(xs) && xs.dimension == 3 ? xs.shape[2] : 1
        const values = new ColorArray(xs.length / length_divisor)
        self._v_compute(xs, values, palette, colors)
        to_big_endian(values)
        return new Uint8ClampedArray(values.buffer)
      },
    }
  }

  // The mapper that defines how this mapper is displayed, e.g. in a color bar.
  get display_mapper(): ColorMapper {
    return this
  }

  create_ticker(): Ticker {
    return BasicTicker.create()
  }

  create_formatter(): TickFormatter {
    return BasicTickFormatter.create()
  }

  create_range(_extent: DisplayExtent): Range {
    unreachable()
  }

  create_scale(_extent: DisplayExtent): Scale {
    unreachable()
  }

  display_extent(_display_low: number | null, _display_high: number | null): DisplayExtent {
    return {index_low: null, index_high: null}
  }

  protected _colors<T>(conv: (c: Color) => T): {nan_color: T} {
    return {nan_color: conv(this.nan_color)}
  }

  protected abstract _v_compute(xs: Arrayable<uint32> | Arrayable<Factor | number | null>,
    values: Arrayable<uint32>, palette: Arrayable<uint32>, colors: {nan_color: uint32}): void
}
