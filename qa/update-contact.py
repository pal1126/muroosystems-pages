from pathlib import Path

# Apply the contact-page change to the versioned Pages release archive.
for lang, previous, hours, label, call in [["en","We welcome general and recruitment enquiries by telephone. Please see the number and opening hours below.","For general and recruitment enquiries, call Monday–Friday, 09:00–18:00 Japan Standard Time (UTC+9).","View telephone &amp; opening hours","Call +81 3 6892 0550"],["ja","お問い合わせや採用に関するご相談は、電話で受け付けています。受付時間と電話番号は下記をご確認ください。","お問い合わせ・採用のご相談は、平日9:00〜18:00（日本時間）にお電話ください。","電話・受付時間を確認する","電話をかける（03-6892-0550）"]]:
    page = Path("public") / lang / "contact/index.html"
    html = page.read_text()
    old_link = f'href="/muroosystems-pages/{lang}/contact/#section-3">{label}</a>'
    new_link = f'href="tel:+81368920550">{call}</a>'
    if previous in html and old_link in html:
        page.write_text(html.replace(previous, hours, 1).replace(old_link, new_link, 1))
    elif hours not in html or new_link not in html:
        raise ValueError(f"Review updated contact markup for {lang}")
