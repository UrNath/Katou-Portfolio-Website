from PIL import Image,ImageFilter
from pathlib import Path
root=Path('public/clients')
path="""M 0 1480 L 16 1398 L 51 1290 Q 72 1200 116 1132 L 218 1074 L 210 1030 L 229 1014 Q 171 987 160 938 Q 156 926 173 900 L 225 786 L 258 592 Q 273 484 295 438 L 400 365 Q 375 328 402 275 Q 436 211 510 172 Q 549 150 566 158 Q 574 167 559 204 L 551 295 L 556 312 Q 604 296 649 306 Q 707 313 751 374 L 777 329 Q 800 277 794 251 Q 790 228 810 240 Q 854 250 878 323 Q 895 367 887 409 Q 879 468 830 497 L 853 574 L 870 702 L 900 826 L 925 921 L 1128 1030 L 1128 1536 L 0 1536 Z"""
svg=f'<svg xmlns="http://www.w3.org/2000/svg" width="1128" height="1536" viewBox="0 0 1128 1536"><path d="{path}" fill="white"/></svg>'
root.joinpath('pidge-mask.svg').write_text(svg)
import cairosvg; cairosvg.svg2png(bytestring=svg.encode(),write_to='/tmp/mask.png')
im=Image.open(root/'pidge-source.jpg').convert('RGB')
mask=Image.open('/tmp/mask.png').convert('L').filter(ImageFilter.GaussianBlur(.65))
front=im.convert('RGBA');front.putalpha(mask);front.save(root/'pidge-foreground.webp',lossless=True)
# Clone exclusively character-free source regions, then blend outside the cutout.
# Upper sky spans the original width. Lower texture comes from the left landscape.
sky=im.crop((0,0,1128,145)).resize((1128,400),Image.Resampling.LANCZOS)
land=im.crop((0,350,150,990)).resize((1128,1136),Image.Resampling.BICUBIC).filter(ImageFilter.GaussianBlur(5))
clean=Image.new('RGB',im.size);clean.paste(sky,(0,0));clean.paste(land,(0,400))
# Blend the two sampled fields smoothly.
for y in range(300,500):
    a=(y-300)/200
    row=Image.blend(sky.crop((0, min(399,y),1128,min(399,y)+1)),land.crop((0,max(0,y-400),1128,max(0,y-400)+1)),a)
    clean.paste(row,(0,y))
repair=mask.filter(ImageFilter.MaxFilter(81)).filter(ImageFilter.GaussianBlur(15))
background=Image.composite(clean,im,repair);background.save(root/'pidge-background.webp',quality=94)
