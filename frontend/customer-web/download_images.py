import os
import urllib.request

images = [
  'https://cdn.tgdd.vn/Products/Images/8781/299655/bhx/tao-fuji-nam-phi-tui-1kg-4-6-trai-202303031448206584.jpg',
  'https://cdn.tgdd.vn/Products/Images/8788/282759/bhx/thit-ba-roi-heo-rut-suon-cp-khay-500g-202206230911072970.jpg',
  'https://cdn.tgdd.vn/Products/Images/7264/299480/bhx/cha-gio-re-tom-cua-cau-tre-400g-202302221008064609.jpg',
  'https://cdn.tgdd.vn/Products/Images/8789/236746/bhx/ca-hoi-nauy-fillet-dong-lanh-nhap-khau-khay-200g-202103272023097561.jpg',
  'https://cdn.tgdd.vn/Products/Images/2386/79555/bhx/sua-tuoi-tiet-trung-khong-duong-vinamilk-100-sua-tuoi-hop-1-lit-202302281313490906.jpg',
  'https://cdn.tgdd.vn/Products/Images/2443/76467/bhx/thung-24-lon-nuoc-ngot-coca-cola-320ml-202302281140081223.jpg',
  'https://cdn.tgdd.vn/Products/Images/3364/79667/bhx/banh-quy-bo-lu-frang-hop-318g-202302281515259648.jpg',
  'https://cdn.tgdd.vn/Products/Images/2282/76669/bhx/dau-dau-nanh-simply-1-lit-202303031021430045.jpg',
  'https://cdn.tgdd.vn/Products/Images/2944/78263/bhx/sua-bot-pediasure-ba-huong-vani-850g-1-10-tuoi-202303030825313884.jpg',
  'https://cdn.tgdd.vn/Products/Images/2533/76807/bhx/dau-goi-clear-mat-lanh-bac-ha-630g-202302220914217154.jpg',
  'https://cdn.tgdd.vn/Products/Images/2823/76796/bhx/nuoc-giat-omo-matic-cua-tren-huong-hoa-hong-ecuador-tui-31-kg-202302220935567389.jpg',
  'https://cdn.tgdd.vn/Products/Images/7391/240215/bhx/thung-24-lon-bia-tiger-330ml-202302221102554619.jpg'
]

os.makedirs('public/categories', exist_ok=True)

for i, url in enumerate(images):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    try:
        with urllib.request.urlopen(req) as response:
            with open(f'public/categories/{i+1}.jpg', 'wb') as out_file:
                out_file.write(response.read())
        print(f"Downloaded {i+1}")
    except Exception as e:
        print(f"Failed {i+1}: {e}")
