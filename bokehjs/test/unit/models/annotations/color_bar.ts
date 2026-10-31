import {expect} from "#framework/assertions"
import {display, fig} from "#framework/layouts"

import {
  CategoricalAxis, CategoricalColorMapper, ColorBar, EqHistColorMapper,
  LinearAxis, LinearColorMapper, LogAxis, LogColorMapper, WeightedStackColorMapper,
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

  describe("palette_to_rgba()", () => {
    it("should return RGBA bytes in palette order", () => {
      const rgba = palette_to_rgba(["#010203", "#04050607"])
      expect(rgba).to.be.instanceof(Uint8ClampedArray)
      expect([...rgba]).to.be.equal([1, 2, 3, 255, 4, 5, 6, 7])
    })
  })
})
