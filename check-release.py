from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 browser=pw.chromium.launch(args=['--no-sandbox'])
 for width in [390,768,1440]:
  p=browser.new_page(viewport={'width':width,'height':900})
  for lang in ['en','ja']:
   base='http://localhost:8793/muroosystems-pages/'
   p.goto(base+lang+'/')
   el=p.locator('#company a[href$="#nukem-technologies"]')
   el.click()
   assert p.locator(':target .entity-name').inner_text().strip()=='NUKEM Technologies GmbH'
   p.goto(base+lang+'/search/?q=NUKEM&category=company')
   result=p.locator('#site-search-results li a').first
   assert result.get_attribute('href').endswith('/company/#nukem-technologies')
   target='en' if lang=='ja' else 'ja'
   p.locator(f'footer a[hreflang={target}]').click()
   assert p.locator('#site-query').input_value()=='NUKEM' and p.locator('#site-category').input_value()=='company'
   p.locator('#site-search-results li a').first.click()
   assert p.locator(':target .entity-name').is_visible()
   assert p.evaluate('document.documentElement.scrollWidth<=innerWidth'),(width,lang)
   print(width,lang,'passed')
  p.close()
