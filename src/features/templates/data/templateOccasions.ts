export type TemplateOccasion = {
  name: string
  region: 'India' | 'International' | 'Country specific'
  palette: [string, string, string, string]
  motif: string
  styles: string[]
}

export const TEMPLATE_OCCASIONS: TemplateOccasion[] = [
  { name: 'Diwali', region: 'India', palette: ['#20143b', '#f4a62a', '#fce7a8', '#fff8e9'], motif: 'diya', styles: ['Traditional', 'Luxury', 'Modern', 'Minimalist', 'Colorful'] },
  { name: 'Holi', region: 'India', palette: ['#fff4e8', '#e84265', '#188d83', '#27214a'], motif: 'powder', styles: ['Festive', 'Colorful', 'Modern', 'Traditional'] },
  { name: 'Raksha Bandhan', region: 'India', palette: ['#fbf2df', '#a34062', '#d2a64a', '#422844'], motif: 'rakhi', styles: ['Traditional', 'Elegant', 'Modern'] },
  { name: 'Navratri', region: 'India', palette: ['#421a43', '#ef6b45', '#efc34b', '#fff5e8'], motif: 'mandala', styles: ['Traditional', 'Festive', 'Colorful'] },
  { name: 'Dussehra', region: 'India', palette: ['#311b37', '#e75d3e', '#e8b64e', '#fff4df'], motif: 'bow', styles: ['Traditional', 'Festive', 'Modern'] },
  { name: 'Ganesh Chaturthi', region: 'India', palette: ['#f9eee2', '#d77339', '#e4b54e', '#3c4440'], motif: 'modak', styles: ['Traditional', 'Elegant', 'Colorful'] },
  { name: 'Janmashtami', region: 'India', palette: ['#102e59', '#e0b649', '#b9dbe5', '#fff7df'], motif: 'flute', styles: ['Traditional', 'Elegant', 'Festive'] },
  { name: 'Makar Sankranti', region: 'India', palette: ['#eaf5f5', '#e76242', '#e9bd42', '#24456c'], motif: 'kite', styles: ['Colorful', 'Traditional', 'Modern'] },
  { name: 'Lohri', region: 'India', palette: ['#38233c', '#ee7540', '#edbd4e', '#fff0d6'], motif: 'bonfire', styles: ['Festive', 'Traditional', 'Modern'] },
  { name: 'Baisakhi', region: 'India', palette: ['#f6eed5', '#c84235', '#e7aa3c', '#294a3b'], motif: 'wheat', styles: ['Traditional', 'Festive', 'Colorful'] },
  { name: 'Eid', region: 'International', palette: ['#123c3b', '#d5b66e', '#f1ead6', '#162a35'], motif: 'crescent', styles: ['Elegant', 'Traditional', 'Modern'] },
  { name: 'Christmas', region: 'International', palette: ['#f4f1e8', '#17483c', '#b63e3e', '#263a36'], motif: 'tree', styles: ['Festive', 'Elegant', 'Modern', 'Minimalist'] },
  { name: 'Halloween', region: 'International', palette: ['#1e1b23', '#f17b31', '#d9b469', '#f8ead8'], motif: 'pumpkin', styles: ['Creative', 'Festive', 'Retro'] },
  { name: 'Thanksgiving', region: 'International', palette: ['#f4eadb', '#a84e32', '#c89149', '#354537'], motif: 'harvest', styles: ['Elegant', 'Vintage', 'Modern'] },
  { name: "Valentine's Day", region: 'International', palette: ['#fff0ed', '#c2445b', '#e7a5a0', '#542a42'], motif: 'heart', styles: ['Elegant', 'Modern', 'Colorful'] },
  { name: 'New Year', region: 'International', palette: ['#101d35', '#d8b15f', '#e9e9df', '#315b67'], motif: 'firework', styles: ['Luxury', 'Modern', 'Festive'] },
  { name: 'Easter', region: 'International', palette: ['#f5f0e5', '#91a879', '#dca6a2', '#66547f'], motif: 'egg', styles: ['Colorful', 'Elegant', 'Modern'] },
  { name: "Mother's Day", region: 'International', palette: ['#f8eee8', '#b96673', '#d8b28a', '#41443b'], motif: 'flower', styles: ['Elegant', 'Modern', 'Minimalist'] },
  { name: "Father's Day", region: 'International', palette: ['#e7eef0', '#355b63', '#c08d57', '#283444'], motif: 'tie', styles: ['Professional', 'Modern', 'Vintage'] },
  { name: "Women's Day", region: 'International', palette: ['#f7edf0', '#8a4775', '#d6a86a', '#42364c'], motif: 'flower', styles: ['Elegant', 'Modern', 'Colorful'] },
  { name: 'Earth Day', region: 'International', palette: ['#e8f0e4', '#316e55', '#75a9a0', '#233d48'], motif: 'globe', styles: ['Educational', 'Minimalist', 'Modern'] },
  { name: 'Indian Independence Day', region: 'India', palette: ['#fff4e5', '#e77835', '#39846e', '#263d4f'], motif: 'tricolor-flag', styles: ['Professional', 'Modern', 'Colorful'] },
  { name: 'Indian Republic Day', region: 'India', palette: ['#fff4e5', '#e77835', '#39846e', '#263d4f'], motif: 'wheel', styles: ['Professional', 'Modern', 'Elegant'] },
  { name: 'Constitution Day', region: 'India', palette: ['#f2eee5', '#28445b', '#b08c54', '#29343d'], motif: 'book', styles: ['Professional', 'Educational', 'Minimalist'] },
  { name: 'Memorial Day', region: 'Country specific', palette: ['#f2f0ea', '#9c3d43', '#425d78', '#252e39'], motif: 'poppy', styles: ['Elegant', 'Professional', 'Minimalist'] },
  { name: 'Veterans Day', region: 'Country specific', palette: ['#f2f0ea', '#a74448', '#425d78', '#252e39'], motif: 'star', styles: ['Professional', 'Modern', 'Minimalist'] },
  { name: 'Other Country-Specific National Celebrations', region: 'Country specific', palette: ['#f3efe6', '#396d70', '#c89c55', '#273c45'], motif: 'flag', styles: ['Professional', 'Modern', 'Colorful'] },
]