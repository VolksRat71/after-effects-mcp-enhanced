# Duolingo Penguin Character - After Effects Implementation Plan

## Character Overview
A simple, friendly penguin following Duolingo brand guidelines with clean shapes, limited colors, and proper hierarchy for animation.

## Reference Documents
- **Characters Guidelines**: `Characters - Duolingo Brand Guidelines.pdf`
- **Shape Language Guidelines**: `Shape Language - Duolingo Brand Guidelines.pdf`

## Critical Workflow Requirements

### We Are NOT Working Blind!
- ✅ **RENDER FRAMES** after every major step using MCP render tools
- ✅ **DUPLICATE COMPOSITION** at each milestone (save progress points)
- ✅ **SAMPLE TIMELINE** to verify hierarchy and parenting
- ✅ **REFERENCE PDFs** continuously for guideline compliance
- ✅ **VISUAL VERIFICATION** - see what we're building in real-time

### Milestone Duplicates (Save Points)
1. `Penguin_v01_Body` - After Phase 1 (body foundation)
2. `Penguin_v02_Head` - After Phase 2 (head & face complete)
3. `Penguin_v03_Scarf` - After Phase 3 (scarf added)
4. `Penguin_v04_Wings` - After Phase 4 (wings complete)
5. `Penguin_v05_Feet` - After Phase 5 (feet added)
6. `Penguin_v06_Final` - After Phase 6 (shadow & polish)

---

## 1. Body Construction (Simple Shapes)

**📖 Reference**: Shape Language PDF - Page 2 (Construction), Characters PDF - Page 2 (Body Types)

### Main Body Group - `BODY_GROUP`
**Anchor Point**: Center-bottom of body (at belly/feet connection point)

- **Body Shape**: Large rounded rectangle (tall vertical orientation)
  - Color: Eel #4B4B4B (dark gray/black)
  - Shape: 1-2 basic rounded rectangles
  - Anchor: Center of shape
  - **Guideline**: Characters use 1-2 basic shapes per body part (Characters PDF p.2)

- **Belly Overlay**: Rounded rectangle (shorter, centered on body)
  - Color: Polar #F7F7F7 (off-white)
  - Position: Center-front of body
  - Anchor: Center of shape
  - Layer: Above body base
  - **Guideline**: Use pastels vs gray on white backgrounds (Shape Language PDF p.11)

**Total Shapes**: 2

**✅ CHECKPOINT**: After building body, RENDER frame and verify rounded shapes!

---

## 2. Head Group - `HEAD_GROUP`

**📖 Reference**: Characters PDF - Page 2-3 (Body Types, Repetition)

**Anchor Point**: Bottom-center (neck connection point)
**Parent**: BODY_GROUP

### Head Base
- **Head Shape**: Rounded rectangle or circle
  - Color: Eel #4B4B4B (matching body)
  - Can be integrated with body OR separate for head rotation
  - Anchor: Bottom-center (neck point)
  - **Guideline**: Use shape repetition - head shape echoes body shape (Characters PDF p.3)

**Total Shapes**: 1

**✅ CHECKPOINT**: RENDER frame to verify head proportions and shape repetition!

---

## 3. Face Group - `FACE_GROUP`

**📖 Reference**: Characters PDF - Pages 4-10 (Eyes, Noses, Mouths)

**Anchor Point**: Center of face area
**Parent**: HEAD_GROUP

### Eyes Subgroup - `EYES_GROUP`
**Anchor Point**: Center between both eyes
**Parent**: FACE_GROUP

- **Left Eye**
  - Outer: White rounded rectangle (Polar #F7F7F7)
  - Pupil: Dark rounded rectangle (Eel #4B4B4B)
  - Anchor: Center of eye
  - **Guideline**: Pupils NOT centered vertically - offset for expression (Characters PDF p.7)

- **Right Eye**
  - Outer: White rounded rectangle (Polar #F7F7F7)
  - Pupil: Dark rounded rectangle (Eel #4B4B4B)
  - Anchor: Center of eye
  - **Guideline**: Use fully-rounded "pill" for eyes, no other shapes (Characters PDF p.7)

**Eye Style**: Round (most versatile for emotions - Characters PDF p.5)
**Total Shapes**: 4 (2 outer + 2 pupils)

### Beak - `BEAK`
**Anchor Point**: Top-center (where beak meets face)
**Parent**: FACE_GROUP

- **Beak Shape**: 1-2 rounded rectangles
  - Color: Fox #FF9600 or Lion #FFB100 (orange)
  - Front view: Small rounded rectangle pointing down
  - Profile view: Takes on body color, angled
  - Anchor: Top-center attachment point
  - **Guideline**: Noses are 1-2 rounded rectangles, saturated color (Characters PDF p.8-9)

**Total Shapes**: 1-2

**✅ CHECKPOINT**: RENDER frame to verify eye expressions and beak color saturation!

---

## 4. Wings Group - `WINGS_GROUP`

**📖 Reference**: Characters PDF - Pages 3-4, 16-19 (Shoulders, Arms and Hands)

**Anchor Point**: Center of body
**Parent**: BODY_GROUP

### Left Wing - `LEFT_WING`
**Anchor Point**: Shoulder attachment point (top-right of wing)
**Parent**: WINGS_GROUP

- **Upper Wing**: Rounded rectangle
  - Color: Eel #4B4B4B (matching body)
  - Anchor: Shoulder socket (concealed behind body)
  - **Guideline**: Arm socket ALWAYS concealed behind torso (Characters PDF p.4)

- **Lower Wing** (optional for detail):
  - Color: Slightly lighter - Wolf #777777
  - Anchor: Connected to upper wing

**Note**: Can be "floating" slightly for animation flexibility (Shape Language PDF p.13)
**Total Shapes per wing**: 1-2

### Right Wing - `RIGHT_WING`
**Anchor Point**: Shoulder attachment point (top-left of wing)
**Parent**: WINGS_GROUP
- Mirror of left wing structure

**Total Wing Shapes**: 2-4

**✅ CHECKPOINT**: RENDER frame to verify shoulders are concealed behind torso! (both wings)

---

## 5. Scarf Group - `SCARF_GROUP`

**📖 Reference**: Shape Language PDF - Pages 2-4, 12-13 (Construction, Simplicity, Floating Accents)

**Anchor Point**: Center-top of scarf (neck area)
**Parent**: BODY_GROUP (sits between head and body in layer order)

### Scarf Elements
- **Scarf Wrap**: Rounded rectangle wrapped around neck area
  - Color: Cardinal #FF4B4B (red) OR Macaw #1CB0F6 (blue)
  - Anchor: Center-top (neck attachment)
  - Layers: Multiple rounded rectangles for folds (2-3 shapes)
  - **Guideline**: Use rounded rectangles for consistency (Shape Language PDF p.2)

- **Scarf Tail Left**: Hanging rounded rectangle
  - Color: Same as scarf wrap
  - Anchor: Top-center (where it connects to wrap)
  - Parent: SCARF_GROUP
  - Can be "floating" slightly (Shape Language PDF p.12-13)

- **Scarf Tail Right**: Hanging rounded rectangle
  - Color: Same as scarf wrap
  - Anchor: Top-center (where it connects to wrap)
  - Parent: SCARF_GROUP
  - Can be "floating" slightly for animation ease

- **Scarf Pattern** (optional): Simple dots or stripes
  - Color: Lighter/darker shade of scarf color
  - Shapes: Small rounded rectangles or circles
  - Keep minimal (2-3 accent shapes max)
  - **Guideline**: Avoid too much color - keep to few colors (Shape Language PDF p.12)

**Total Shapes**: 4-6

**✅ CHECKPOINT**: RENDER frame to verify scarf color vibrancy and floating tails!

---

## 6. Feet Group - `FEET_GROUP`

**📖 Reference**: Shape Language PDF - Pages 12-13 (Floating Accents), Characters PDF - Page 18-19 (Arms and Hands - same principle)

**Anchor Point**: Center between both feet
**Parent**: BODY_GROUP

### Feet (Floating Elements - Duolingo Style!)

- **Left Foot**: Rounded triangle or pill shape
  - Color: Fox #FF9600 or Lion #FFB100 (matching beak)
  - Anchor: Top-center (ankle point)
  - **Gap**: Small space between foot and body (floating)
  - **Guideline**: Floating objects give flexibility for animation (Shape Language PDF p.13)

- **Right Foot**: Rounded triangle or pill shape
  - Color: Fox #FF9600 or Lion #FFB100 (matching beak)
  - Anchor: Top-center (ankle point)
  - **Gap**: Small space between foot and body (floating)
  - **Guideline**: Keep feet as abstract as possible (Characters PDF p.18)

**Total Shapes**: 2

**✅ CHECKPOINT**: RENDER frame to verify floating gap between feet and body!

---

## 7. Shadow - `SHADOW`

**📖 Reference**: Shape Language PDF - Pages 5-7 (Shadows and Shading)

**Anchor Point**: Center of shadow
**Parent**: None (stays on ground plane)

- **Shadow Shape**: Horizontal pill shape (rounded rectangle)
  - Color: Depends on background (darker than surface)
  - Shape: Never oval - always pill (no perspective)
  - Anchor: Center
  - Position: Directly below penguin feet
  - **Guideline**: Shadows ALWAYS appear below as pill shape - never oval (Shape Language PDF p.6-7)
  - **Guideline**: Shadow color must be darker than base it sits on (Shape Language PDF p.7)

**Total Shapes**: 1

**✅ CHECKPOINT**: RENDER final frame to verify pill-shaped shadow (not oval!) and overall character!

---

## 8. Complete Layer Hierarchy

```
PENGUIN_CHARACTER_COMP
│
├── SHADOW (no parent)
│
└── BODY_GROUP (master control)
    ├── Body Shape
    ├── Belly Overlay
    │
    ├── HEAD_GROUP
    │   ├── Head Shape
    │   │
    │   └── FACE_GROUP
    │       ├── EYES_GROUP
    │       │   ├── Left_Eye_Outer
    │       │   ├── Left_Eye_Pupil
    │       │   ├── Right_Eye_Outer
    │       │   └── Right_Eye_Pupil
    │       │
    │       └── BEAK
    │           └── Beak_Shape
    │
    ├── SCARF_GROUP
    │   ├── Scarf_Wrap_1
    │   ├── Scarf_Wrap_2 (folds)
    │   ├── Scarf_Tail_Left
    │   ├── Scarf_Tail_Right
    │   └── Scarf_Pattern (optional accents)
    │
    ├── WINGS_GROUP
    │   ├── LEFT_WING
    │   │   └── Left_Wing_Shape
    │   │
    │   └── RIGHT_WING
    │       └── Right_Wing_Shape
    │
    └── FEET_GROUP
        ├── Left_Foot
        └── Right_Foot
```

---

## 9. Color Palette Summary

### Primary Colors (3-4 max)
- **Body/Head**: Eel #4B4B4B (dark gray/black)
- **Belly/Eyes**: Polar #F7F7F7 (off-white)
- **Beak/Feet**: Fox #FF9600 OR Lion #FFB100 (orange)
- **Scarf**: Cardinal #FF4B4B (red) OR Macaw #1CB0F6 (blue)

### Optional Accents
- **Wing depth**: Wolf #777777 (lighter gray)
- **Scarf pattern**: Lighter/darker variant of scarf color

**Total Colors**: 4-5 maximum (within Duolingo guidelines)

---

## 10. Shape Repetition & Rhythm

### Shape Consistency
- **Primary shape**: Rounded rectangles (used throughout)
- **Head shape**: Echoes body shape
- **Feet shape**: Relates to beak shape
- **Scarf**: Rounded rectangles maintain consistency

### Visual Rhythm (Size Variation)
1. **Large**: Body
2. **Medium**: Head, scarf wrap
3. **Small**: Wings, beak
4. **Tiny**: Feet, eyes, scarf tails

**No ovals!** - Only geometric shapes (rounded rectangles, circles, rounded triangles)

---

## 11. Anchor Point Reference Guide

| Element | Anchor Position | Purpose |
|---------|----------------|---------|
| BODY_GROUP | Center-bottom | Master control pivot |
| HEAD_GROUP | Bottom-center | Head rotation from neck |
| FACE_GROUP | Center of face | Facial expression control |
| EYES_GROUP | Between eyes | Eye movement together |
| Individual Eyes | Center of eye | Individual eye rotation |
| BEAK | Top-center | Beak animation from face |
| WINGS_GROUP | Center of body | Symmetrical wing control |
| LEFT_WING | Shoulder socket | Rotation from shoulder |
| RIGHT_WING | Shoulder socket | Rotation from shoulder |
| SCARF_GROUP | Center-top (neck) | Scarf sway from neck |
| Scarf Tails | Top-center | Tail swing animation |
| FEET_GROUP | Between feet | Walk cycle control |
| Individual Feet | Top-center (ankle) | Foot rotation |
| SHADOW | Center | Ground tracking |

---

## 12. Implementation Steps (After Effects MCP)

**📖 Reference**: All PDFs - verify guidelines at each step!

### Phase 1: Body Foundation ⭐
**Comp Name**: `Penguin_Character`
1. Create new composition: "Penguin_Character" (1920x1080, white background)
2. Create BODY_GROUP null object
3. Build body shape (rounded rectangle - Eel #4B4B4B)
4. Build belly overlay (rounded rectangle - Polar #F7F7F7)
5. Parent body shapes to BODY_GROUP
6. Set BODY_GROUP anchor to center-bottom
7. **🎬 RENDER FRAME**: Check rounded shapes and proportions
8. **SAMPLE TIMELINE**: Verify parenting by moving BODY_GROUP
9. **💾 DUPLICATE COMP**: Save as `Penguin_v01_Body`

### Phase 2: Head & Face ⭐
**Reference**: Characters PDF p.4-10
10. Create HEAD_GROUP null, parent to BODY_GROUP
11. Build head shape, parent to HEAD_GROUP
12. Create FACE_GROUP null, parent to HEAD_GROUP
13. Create EYES_GROUP null, parent to FACE_GROUP
14. Build eye shapes (4 total), parent to EYES_GROUP
15. Build beak shape, parent to FACE_GROUP
16. Set all anchor points correctly
17. **🎬 RENDER FRAME**: Verify pupils NOT centered vertically
18. **SAMPLE TIMELINE**: Test HEAD_GROUP rotation
19. **💾 DUPLICATE COMP**: Save as `Penguin_v02_Head`

### Phase 3: Scarf ⭐
**Reference**: Shape Language PDF p.12-13
20. Create SCARF_GROUP null, parent to BODY_GROUP
21. Build scarf wrap shapes (2-3 rounded rectangles - Cardinal #FF4B4B)
22. Build scarf tail shapes (2 rounded rectangles)
23. Add optional pattern details
24. Parent all scarf elements to SCARF_GROUP
25. Position scarf layer order between head and body
26. **🎬 RENDER FRAME**: Check scarf color vibrancy and floating tails
27. **SAMPLE TIMELINE**: Test scarf sway animation
28. **💾 DUPLICATE COMP**: Save as `Penguin_v03_Scarf`

### Phase 4: Wings ⭐
**Reference**: Characters PDF p.3-4, 16-19
29. Create WINGS_GROUP null, parent to BODY_GROUP
30. Create LEFT_WING null, parent to WINGS_GROUP
31. Create RIGHT_WING null, parent to WINGS_GROUP
32. Build wing shapes, parent to respective wing nulls
33. Set wing anchor points at shoulder sockets
34. Ensure shoulder sockets hidden behind body
35. **🎬 RENDER FRAME**: Verify shoulders concealed behind torso
36. **SAMPLE TIMELINE**: Test wing flapping
37. **💾 DUPLICATE COMP**: Save as `Penguin_v04_Wings`

### Phase 5: Feet ⭐
**Reference**: Shape Language PDF p.12-13
38. Create FEET_GROUP null, parent to BODY_GROUP
39. Build left foot (rounded triangle - Fox #FF9600)
40. Build right foot (rounded triangle - Fox #FF9600)
41. Parent feet to FEET_GROUP
42. Position feet with small gap (floating)
43. Set anchor points at top-center (ankle)
44. **🎬 RENDER FRAME**: Verify floating gap between feet and body
45. **SAMPLE TIMELINE**: Test walk cycle movement
46. **💾 DUPLICATE COMP**: Save as `Penguin_v05_Feet`

### Phase 6: Shadow & Polish ⭐
**Reference**: Shape Language PDF p.5-7
47. Create shadow shape (pill - no parent, darker than white background)
48. Position shadow below feet
49. Verify all anchor points
50. Test hierarchy by moving parent nulls
51. Check layer order for proper overlapping
52. **🎬 RENDER FRAME**: Final character verification - pill shadow, overall design
53. **SAMPLE TIMELINE**: Test entire rig movement
54. **💾 DUPLICATE COMP**: Save as `Penguin_v06_FINAL`
55. **🎬 RENDER MULTIPLE POSES**: Test different expressions and poses

---

## 13. Total Shape Count

| Element | Shape Count |
|---------|-------------|
| Body | 2 |
| Head | 1 |
| Eyes | 4 |
| Beak | 1-2 |
| Wings | 2-4 |
| Scarf | 4-6 |
| Feet | 2 |
| Shadow | 1 |
| **TOTAL** | **17-22 shapes** ✓ |

**Within Duolingo Guidelines**: 15-20 shapes recommended (we're at 17-22 with scarf)

---

## 14. Design Guidelines Checklist

- ✓ Simple shapes (1-2 per body part)
- ✓ Rounded edges (no pointy shapes)
- ✓ Limited colors (4-5 max)
- ✓ Geometric shapes (no ovals)
- ✓ Shape repetition (rounded rectangles)
- ✓ Visual rhythm (varied sizes)
- ✓ Flat perspective (no forced depth)
- ✓ Floating elements (feet)
- ✓ Proper anchor points for animation
- ✓ Clean hierarchy for rigging
- ✓ Pill-shaped shadow (not oval)
- ✓ Colorful & vibrant palette
- ✓ Arm sockets concealed (wings behind body)
- ✓ Pupils not vertically centered (expression)

---

## 15. Expression & Personality Notes

### Default Pose
- Slight waddle stance (one foot slightly forward)
- Wings at sides, slightly out from body
- Eyes looking slightly to side (not dead-center)
- Beak small and understated
- Scarf hanging naturally with slight asymmetry

### Character Personality
- Friendly and approachable
- Slightly quirky (Duolingo style)
- Winter-ready (with scarf)
- Ready for animation/posing

---

## 16. Animation Considerations

### Riggable Elements
- **Head**: Nods, turns, tilts
- **Eyes**: Blinks, looks around, expressions
- **Beak**: Opens/closes for speech
- **Wings**: Flap, wave, gesture
- **Scarf**: Sways, flutters in wind
- **Feet**: Walk cycle, waddle
- **Body**: Bounce, lean, squash/stretch

### Floating Elements Benefit
- Feet can move independently without breaking connection
- Scarf tails can sway freely
- Easy to turn character in space

---

## Notes & Reminders

- Keep shapes SIMPLE - resist adding detail
- Use pathfinder to cut/combine shapes if needed
- All shapes must have rounded corners
- Avoid gray - use color!
- Background is white, so use Polar (off-white) instead
- Test hierarchy by moving parent nulls before finalizing
- Scarf adds personality but keeps within shape budget
- Remember: Simple construction = easier animation

---

**Ready to implement!** Review this plan and adjust as needed before building in After Effects.
