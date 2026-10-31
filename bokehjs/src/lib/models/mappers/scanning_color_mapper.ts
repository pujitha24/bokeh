import type {ContinuousDisplayExtent} from "./continuous_color_mapper"
import {ContinuousColorMapper} from "./continuous_color_mapper"
import type {Arrayable, uint32} from "core/types"
import {left_edge_index} from "core/util/arrayable"
import type * as p from "core/properties"

export type ScanningScanData = {
  min: number
  max: number
  binning: Arrayable<number>
  force_low_cutoff: boolean
}

export type ScanningDisplayExtent = ContinuousDisplayExtent & {binning: Arrayable<number>}

export namespace ScanningColorMapper {
  export type Attrs = p.AttrsOf<Props>

  export type Props = ContinuousColorMapper.Props
}

export interface ScanningColorMapper extends ScanningColorMapper.Attrs {}

export abstract class ScanningColorMapper extends ContinuousColorMapper {
  declare properties: ScanningColorMapper.Props

  declare MetricsType: {min: number, max: number, binning: Arrayable<number>, force_low_cutoff: boolean}

  override display_extent(display_low: number | null, display_high: number | null): ScanningDisplayExtent {
    const {start, end} = super.display_extent(display_low, display_high)
    const {binning, force_low_cutoff, min} = this.metrics

    if (force_low_cutoff && (display_low == null || min > display_low)) {
      // ScanningColorMapper overrides display_low, for example when EqHistColorMapper
      // uses rescale_discrete_levels=True.
      display_low = min
    }

    if (display_high != null && display_low != null && display_high < display_low) {
      // Empty color bar.
      return {index_low: 0, index_high: -1, start, end, binning: [NaN]}
    }

    let index_high = null
    if (display_high != null) {
      const index = this.value_to_index(display_high, binning.length)
      if (index < binning.length-1) {
        index_high = index
      }
    }

    let index_low = null
    if (display_low != null) {
      const index = this.value_to_index(display_low, binning.length)
      if (index > 0) {
        index_low = index
      }
    }

    if (index_low == null && index_high == null) {
      return {index_low, index_high, start, end, binning}
    }

    // Slice binning array.
    const first = index_low ?? 0
    const last = index_high != null ? index_high + 1 : binning.length - 1
    const n = last - first + 1
    if (n > 0) {
      const new_binning = new Array<number>(n)
      for (let i = 0; i < n; i++) {
        new_binning[i] = binning[i + first]
      }
      return {index_low, index_high, start, end, binning: new_binning}
    } else {
      return {index_low, index_high, start, end, binning: [NaN]}
    }
  }

  override index_to_value(index: number): number {
    const scan_data = this._scan_data as ScanningScanData
    return scan_data.binning[index]
  }

  override value_to_index(value: number, palette_length: number): number {
    const scan_data = this._scan_data as ScanningScanData

    if (value < scan_data.binning[0]) {
      return -1
    } else if (value > scan_data.binning[scan_data.binning.length-1]) {
      return palette_length
    } else {
      return left_edge_index(value, scan_data.binning)
    }
  }

  // Equivalent to the generic implementation with `value_to_index()` and
  // `left_edge_index()` inlined, which is significantly faster for large images.
  protected override _map_values(data: Arrayable<number>, values: Arrayable<uint32>,
      palette: Arrayable<uint32>, colors: {nan_color: uint32, low_color: uint32, high_color: uint32}): void {
    const {nan_color, low_color, high_color} = colors
    const {binning} = this._scan_data as ScanningScanData

    const n = palette.length
    const last = binning.length - 1
    const low_edge = binning[0]
    const high_edge = binning[last]

    for (let i = 0, end = data.length; i < end; i++) {
      const value = data[i]

      if (isNaN(value)) {
        values[i] = nan_color
      } else if (value < low_edge) {
        values[i] = low_color
      } else if (value > high_edge) {
        values[i] = high_color
      } else {
        let left = 0
        let right = last
        while (right - left > 1) {
          const mid = (left + right) >>> 1
          if (value >= binning[mid]) {
            left = mid
          } else {
            right = mid
          }
        }
        values[i] = left < n ? palette[left] : high_color
      }
    }
  }
}
