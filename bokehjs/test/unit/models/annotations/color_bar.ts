import {expect} from "#framework/assertions"
import {display, fig} from "#framework/layouts"

import {
  BasicTickFormatter, BasicTicker, BinnedTicker,
  CategoricalAxis, CategoricalColorMapper, CategoricalScale, CategoricalTickFormatter, CategoricalTicker,
  ColorBar, EqHistColorMapper, FactorRange,
  LinearAxis, LinearColorMapper, LinearInterpolationScale, LinearScale,
  LogAxis, LogColorMapper, LogScale, LogTicker,
  Range1d, WeightedStackColorMapper,
} from "@bokehjs/models"
import type {ColorMapper} from "@bokehjs/models/mappers/color_mapper"
import {palette_to_rgba} from "@bokehjs/models/mappers/color_mapper"
import {AxisView} from "@bokehjs/models/axes/axis"
import {Spectral10} from "@bokehjs/api/palettes"

describe("ColorBar", () => {

  describe("display cutoffs", () => {

    it("should be null by default", () => {
      const palette = Spectral10
      const color_mapper = LinearColorMapper.create({palette})
      const color_bar = ColorBar.create({color_mapper})

      expect(color_bar.display_low).to.be.null
      expect(color_bar.display_high).to.be.null
    })
  })

  describe("color mapper guides", () => {
    const palette = ["#000000", "#ff0000", "#00ff00", "#0000ff"]
    const continuous = {palette, low: 0, high: 4}

    it("should support LinearColorMapper", () => {
      const mapper = LinearColorMapper.create(continuous)
      const extent = mapper.display_extent(null, null)
      expect(mapper.create_ticker()).to.be.instanceof(BasicTicker)
      expect(mapper.create_formatter()).to.be.instanceof(BasicTickFormatter)
      expect(mapper.create_range(extent)).to.be.instanceof(Range1d)
      expect(mapper.create_scale()).to.be.instanceof(LinearScale)
    })

    it("should support LogColorMapper", () => {
      const mapper = LogColorMapper.create({palette, low: 1, high: 16})
      const extent = mapper.display_extent(null, null)
      expect(mapper.create_ticker()).to.be.instanceof(LogTicker)
      expect(mapper.create_formatter()).to.be.instanceof(BasicTickFormatter)
      expect(mapper.create_range(extent)).to.be.instanceof(Range1d)
      expect(mapper.create_scale()).to.be.instanceof(LogScale)
    })

    it("should support EqHistColorMapper", () => {
      const mapper = EqHistColorMapper.create(continuous)
      const extent = mapper.display_extent(null, null)
      const ticker = mapper.create_ticker() as BinnedTicker
      expect(ticker).to.be.instanceof(BinnedTicker)
      expect(ticker.mapper).to.be.equal(mapper)
      expect(mapper.create_formatter()).to.be.instanceof(BasicTickFormatter)
      expect(mapper.create_range(extent)).to.be.instanceof(Range1d)
      expect(mapper.create_scale(extent)).to.be.instanceof(LinearInterpolationScale)
    })

    it("should support CategoricalColorMapper", () => {
      const mapper = CategoricalColorMapper.create({palette, factors: ["a", "b"]})
      const extent = mapper.display_extent(null, null)
      const range = mapper.create_range()
      expect(mapper.create_ticker()).to.be.instanceof(CategoricalTicker)
      expect(mapper.create_formatter()).to.be.instanceof(CategoricalTickFormatter)
      expect(range).to.be.instanceof(FactorRange)
      expect((range as FactorRange).factors).to.be.equal(["a", "b"])
      expect(mapper.create_scale()).to.be.instanceof(CategoricalScale)
      expect(extent).to.be.equal({index_low: null, index_high: null})
    })

    it("should use alpha_mapper of WeightedStackColorMapper", () => {
      const alpha_mapper = LinearColorMapper.create(continuous)
      const mapper = WeightedStackColorMapper.create({palette, alpha_mapper})
      expect(mapper.display_mapper).to.be.equal(alpha_mapper)
      expect(alpha_mapper.display_mapper).to.be.equal(alpha_mapper)
    })
  })

  describe("axis", () => {
    const palette = ["#000000", "#ff0000"]

    async function axis_of(color_mapper: ColorMapper) {
      const color_bar = ColorBar.create({color_mapper})
      const plot = fig([200, 200])
      plot.add_layout(color_bar, "right")
      const {view} = await display(plot)
      const axes = view.owner.get_one(color_bar).children_views().filter((child) => child instanceof AxisView)
      expect(axes.length).to.be.equal(1)
      return axes[0].model
    }

    it("should be derived from the scale of the color mapper", async () => {
      expect(await axis_of(LinearColorMapper.create({palette, low: 0, high: 1}))).to.be.instanceof(LinearAxis)
      expect(await axis_of(LogColorMapper.create({palette, low: 1, high: 10}))).to.be.instanceof(LogAxis)
      expect(await axis_of(EqHistColorMapper.create({palette, low: 0, high: 1}))).to.be.instanceof(LinearAxis)
      expect(await axis_of(CategoricalColorMapper.create({palette, factors: ["a", "b"]}))).to.be.instanceof(CategoricalAxis)
    })
  })

  describe("display extent", () => {
    const palette = ["#000000", "#ff0000", "#00ff00", "#0000ff"]

    it("should cut off the palette of a continuous mapper", () => {
      const mapper = LinearColorMapper.create({palette, low: 0, high: 4})
      expect(mapper.display_extent(null, null)).to.be.equal({index_low: null, index_high: null, start: 0, end: 4})
      expect(mapper.display_extent(1.5, 2.5)).to.be.equal({index_low: 1, index_high: 2, start: 1, end: 3})
      expect(mapper.display_extent(3, 1)).to.be.equal({index_low: 0, index_high: -1, start: NaN, end: NaN})
    })

    it("should cut off the binning of a scanning mapper", () => {
      const mapper = EqHistColorMapper.create({palette})
      mapper.v_compute([0, 1, 2, 3, 4, 5, 6, 7, 8])
      const {binning} = mapper.metrics

      const full = mapper.display_extent(null, null)
      expect(full.index_low).to.be.null
      expect(full.index_high).to.be.null
      expect(full.binning).to.be.equal(binning)

      const cut = mapper.display_extent(binning[1], binning[2])
      expect(cut.index_low).to.be.equal(1)
      expect(cut.index_high).to.be.equal(2)
      expect(cut.binning).to.be.equal([binning[1], binning[2], binning[3]])

      const empty = mapper.display_extent(3, 1)
      expect(empty.index_low).to.be.equal(0)
      expect(empty.index_high).to.be.equal(-1)
      expect(empty.binning).to.be.equal([NaN])
    })
  })

  describe("palette_to_rgba()", () => {
    it("should return RGBA bytes in palette order", () => {
      const rgba = palette_to_rgba(["#010203", "#04050607"])
      expect(rgba).to.be.instanceof(Uint8ClampedArray)
      expect([...rgba]).to.be.equal([1, 2, 3, 255, 4, 5, 6, 7])
    })
  })
})
