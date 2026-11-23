-- Kota Aksara Langit • Natural Edition
-- BC violet is retained as a brand highlight, not the color of every surface.
-- All colors are authored here so future portals and games can share one theme.
local Theme = {}
Theme.Color = {
 Brand = Color3.fromRGB(124,58,237),
 BrandSoft = Color3.fromRGB(142,119,198),
 Sky = Color3.fromRGB(165,208,228),
 SkyWarm = Color3.fromRGB(212,230,229),
 Leaf = Color3.fromRGB(102,156,106),
 LeafDark = Color3.fromRGB(63,117,84),
 LeafLight = Color3.fromRGB(147,187,126),
 Earth = Color3.fromRGB(133,108,87),
 Stone = Color3.fromRGB(175,161,143),
 StoneLight = Color3.fromRGB(212,203,186),
 Sand = Color3.fromRGB(234,217,183),
 Wood = Color3.fromRGB(148,107,76),
 WoodDark = Color3.fromRGB(103,74,61),
 Ivory = Color3.fromRGB(251,247,236),
 Ink = Color3.fromRGB(32,45,62),
 Water = Color3.fromRGB(91,167,184),
 Copper = Color3.fromRGB(196,147,97),
 Lilac = Color3.fromRGB(190,177,215),
 Rose = Color3.fromRGB(203,139,145),
 Success = Color3.fromRGB(57,149,106),
 Retry = Color3.fromRGB(212,139,94),
 Reward = Color3.fromRGB(235,182,86),
}
Theme.Category={
 Kata=Theme.Color.LeafDark,
 Literasi=Theme.Color.Water,
 Cepat=Theme.Color.Copper,
 Tantangan=Theme.Color.BrandSoft,
 Kompetitif=Theme.Color.Rose,
}
Theme.Material={
 Ground=Enum.Material.Grass,
 Path=Enum.Material.Cobblestone,
 Stone=Enum.Material.Slate,
 Timber=Enum.Material.WoodPlanks,
 Painted=Enum.Material.SmoothPlastic,
 Water=Enum.Material.Glass,
}
Theme.Effects={
 BloomIntensity=.055,
 BloomThreshold=2.1,
 BloomSize=12,
 AtmosphereDensity=.19,
 AtmosphereHaze=.68,
 Saturation=-.055,
 Contrast=.035,
}
return Theme
