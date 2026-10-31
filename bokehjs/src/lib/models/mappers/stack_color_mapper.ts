import {ColorMapper} from "./color_mapper"
import type * as p from "core/properties"
import type {Arrayable} from "core/types"
import {is_NDArray} from "core/util/ndarray"

export namespace StackColorMapper {
  export type Attrs = p.AttrsOf<Props>

  export type Props = ColorMapper.Props
}

export interface StackColorMapper extends StackColorMapper.Attrs {}

export abstract class StackColorMapper extends ColorMapper {
  declare properties: StackColorMapper.Props

  // A 3D array holds one stack of values per color.
  protected override _output_length(xs: Arrayable<unknown>): number {
    return is_NDArray(xs) && xs.dimension == 3 ? xs.length / xs.shape[2] : xs.length
  }
}
