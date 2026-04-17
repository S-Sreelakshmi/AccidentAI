import urllib.request as r, urllib.parse as p, json
q = '[out:json];(node["amenity"="hospital"](around:5000,11.2588,75.7804);way["amenity"="hospital"](around:5000,11.2588,75.7804););out center;'
try:
    print(r.urlopen(r.Request('https://overpass-api.de/api/interpreter', data=f'data={p.quote(q)}'.encode())).read().decode()[:400])
except Exception as e:
    print("FAILED PRIMARY:", e)
    print(r.urlopen(r.Request('https://lz4.overpass-api.de/api/interpreter', data=f'data={p.quote(q)}'.encode())).read().decode()[:400])
