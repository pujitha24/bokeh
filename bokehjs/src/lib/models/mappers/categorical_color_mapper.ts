import type {CategoricalMapper} from "./categorical_mapper"
import {cat_v_compute} from "./categorical_mapper"
import {ColorMapper} from "./color_mapper"
import type {TickFormatter} from "../formatters/tick_formatter"
import {CategoricalTickFormatter} from "../formatters/categorical_tick_formatter"
import type {Factor} from "../ranges/factor_range"
import {FactorRange, FactorSeq} from "../ranges/factor_range"
import type {Range} from "../ranges/range"
import type {Scale} from "../scales/scale"
import {CategoricalScale} from "../scales/categorical_scale"
import type {Ticker} from "../tickers/ticker"
import {CategoricalTicker} from "../tickers/categorical_ticker"

import type * as p from "core/properties"
import type {Arrayable, uint32} from "core/types"

export namespace CategoricalColorMapper {
  export type Attrs = p.AttrsOf<Props>

  export type Props = ColorMapper.Props & CategoricalMapper.Props
}

export interface CategoricalColorMapper extends CategoricalColorMapper.Attrs {}

export class CategoricalColorMapper extends ColorMapper {
  declare properties: CategoricalColorMapper.Props

  static {
    this.define<CategoricalColorMapper.Props>(({Int, NonNegative, Nullable}) => ({
      factors: [ FactorSeq ],
      start:   [ NonNegative(Int), 0 ],
      end:     [ Nullable(NonNegative(Int)), null ],
    }))
  }

  override create_ticker(): Ticker {
    return CategoricalTicker.create()
  }

  override create_formatter(): TickFormatter {
    return CategoricalTickFormatter.create()
  }

  override create_range(): Range {
    return FactorRange.create({factors: this.factors})
  }

  override create_scale(): Scale {
    return CategoricalScale.create()
  }

  protected _v_compute(data: Arrayable<Factor | number | null>, values: Arrayable<uint32>,
      palette: Arrayable<uint32>, {nan_color}: {nan_color: uint32}): void {
    cat_v_compute(data, this.factors, palette, values, this.start, this.end, nan_color)
  }
}
