# Sheep Run Asset Pack v1

This folder contains the first reviewable split asset pack generated from the approved visual direction.

## Review

- `docs/design/assets-v1/review/assets-contact-sheet.png` shows every sliced transparent asset on a checkerboard background.

## Final transparent assets

- `sprites/sheep/`
  - `sheep_idle_south.png`
  - `sheep_idle_east.png`
  - `sheep_idle_north.png`
  - `sheep_idle_west.png`
  - `sheep_run_south.png`
  - `sheep_run_east.png`
  - `sheep_run_north.png`
  - `sheep_run_west.png`
- `structures/`
  - `barn.png`
- `obstacles/`
  - `hay_bale.png`
  - `fence_segment.png`
  - `shrub_flower.png`
  - `pasture_tree.png`
  - `gate_segment.png`
  - `hedge.png`
  - `flower_patch.png`
  - `hay_bucket.png`
- `scene/`
  - `grass_tile_light.png`
  - `grass_tile_dark.png`
  - `board_edge_corner.png`
  - `grass_corner_flowers.png`
  - `contact_shadow.png`
  - `wrong_tap_ripple.png`
  - `direction_arrow.png`
  - `success_sparkle.png`
- `ui/`
  - `objective_panel.png`
  - `status_chip.png`
  - `menu_card.png`
  - `primary_play_button.png`
  - `secondary_language_button.png`
  - `warning_retry_button.png`
  - `restart_icon_button.png`
  - `sound_icon_button.png`
  - `star_badge.png`
  - `crown_badge.png`
  - `level_tile_button.png`
  - `globe_icon.png`

## Source sheets

`docs/design/assets-v1/source/` keeps the generated chroma-key source images and the transparent sheet versions used for slicing. UI assets were sliced by connected transparent regions because the generated UI source sheet does not align to a strict fixed grid.

## Notes

- All final sliced assets are RGBA PNG files.
- The sheep directions are readable front/back/left/right views. The current pack includes one idle and one run/step pose per direction.
- `scene/contact_shadow.png` and `scene/success_sparkle.png` include soft semi-transparent pixels and may need a dedicated effects pass if sharper alpha is required.
