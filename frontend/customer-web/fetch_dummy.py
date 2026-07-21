import json
import urllib.request

try:
    req = urllib.request.Request('https://dummyjson.com/products?limit=100')
    response = urllib.request.urlopen(req)
    data = json.loads(response.read().decode('utf-8'))
    for p in data['products']:
        print(p['category'], p['thumbnail'])
except Exception as e:
    print(e)
