# Sheep Run Asset Pack v1

This folder contains the first reviewable split asset pack generated from the approved visual direction.

## Review

- `docs/design/assets-v1/review/assets-contact-sheet.png` shows every sliced transparent asset on a checkerboard background.

## Final transparent assets

- `sprites/sheep/`
  - `sheep_idle_south.webp`
  - `sheep_idle_east.webp`
  - `sheep_idle_north.webp`
  - `sheep_idle_west.webp`
  - `sheep_run_south.webp`
  - `sheep_run_east.webp`
  - `sheep_run_north.webp`
  - `sheep_run_west.webp`
- `structures/`
  - `barn.webp`
- `obstacles/`
  - `hay_bale.webp`
  - `fence_segment.webp`
  - `shrub_flower.webp`
  - `pasture_tree.webp`
  - `gate_segment.webp`
  - `hedge.webp`
  - `flower_patch.webp`
  - `hay_bucket.webp`
- `scene/`
  - `grass_tile_light.webp`
  - `grass_tile_dark.webp`
  - `board_edge_corner.webp`
  - `grass_corner_flowers.webp`
  - `contact_shadow.webp`
  - `wrong_tap_ripple.webp`
  - `direction_arrow.webp`
  - `success_sparkle.webp`
- `ui/`
  - `objective_panel.webp`
  - `status_chip.webp`
  - `menu_card.webp`
  - `primary_play_button.webp`
  - `secondary_language_button.webp`
  - `warning_retry_button.webp`
  - `restart_icon_button.webp`
  - `sound_icon_button.webp`
  - `star_badge.webp`
  - `crown_badge.webp`
  - `level_tile_button.webp`
  - `globe_icon.webp`

## Source sheets

`docs/design/assets-v1/source/` keeps the generated chroma-key source images and the transparent sheet versions used for slicing. UI assets were sliced by connected transparent regions because the generated UI source sheet does not align to a strict fixed grid.

## Notes

- All final sliced runtime assets are transparent WebP files generated from the review PNG slices.
- Direction is reinforced in canvas by a high-contrast arrow badge because the sheep silhouettes read strongest as left/right at small sizes.
- `scene/contact_shadow.webp` and `scene/success_sparkle.webp` include soft semi-transparent pixels and may need a dedicated effects pass if sharper alpha is required.
