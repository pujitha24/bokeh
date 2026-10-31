import {expect} from "#framework/assertions"

import {ColorBar, LinearColorMapper} from "@bokehjs/models"
import {palette_to_rgba} from "@bokehjs/models/mappers/color_mapper"
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

  describe("palette_to_rgba()", () => {
    it("should return RGBA bytes in palette order", () => {
      const rgba = palette_to_rgba(["#010203", "#04050607"])
      expect(rgba).to.be.instanceof(Uint8ClampedArray)
      expect([...rgba]).to.be.equal([1, 2, 3, 255, 4, 5, 6, 7])
    })
  })
})
