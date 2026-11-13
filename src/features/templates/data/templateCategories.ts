import type { TemplateCategory } from '../model/template.types'

export const TEMPLATE_CATEGORIES: TemplateCategory[] = [
  {
    id: 'social-media',
    label: 'Social Media',
    group: 'Social Media',
    subcategories: [
      'Instagram Posts', 'Instagram Stories', 'Instagram Reels Covers', 'Facebook Posts',
      'Facebook Covers', 'YouTube Thumbnails', 'YouTube Channel Banners', 'LinkedIn Posts',
      'Pinterest Pins',
    ],
    designStyles: ['Modern', 'Creative', 'Colorful', 'Professional', 'Minimalist', '3D'],
    featured: true,
  },
  {
    id: 'festivals-occasions',
    label: 'Festivals & Occasions',
    group: 'Festivals & Occasions',
    subcategories: [
      'Diwali', 'Holi', 'Raksha Bandhan', 'Navratri', 'Dussehra', 'Ganesh Chaturthi',
      'Janmashtami', 'Makar Sankranti', 'Lohri', 'Baisakhi', 'Eid', 'Christmas',
      'Halloween', 'Thanksgiving', "Valentine's Day", 'New Year', 'Easter', "Mother's Day",
      "Father's Day", "Women's Day", 'Earth Day', 'Indian Independence Day',
      'Indian Republic Day', 'Constitution Day', 'Memorial Day', 'Veterans Day',
      'Other Country-Specific National Celebrations',
    ],
    designStyles: ['Traditional', 'Festive', 'Luxury', 'Modern', 'Minimalist', 'Colorful', 'Elegant'],
    featured: true,
  },
  {
    id: 'engineering',
    label: 'Engineering',
    group: 'Education & Careers',
    subcategories: [
      'Mechanical Engineering', 'Civil Engineering', 'Electrical Engineering',
      'Computer Science', 'Software Engineering', 'Electronics Engineering', 'Architecture',
      'Engineering Projects', 'Technical Presentations', 'Engineering Resumes',
      'Technical Reports', 'Project Cover Pages', 'Technical Posters',
    ],
    designStyles: ['Technical', 'Professional', 'Minimalist', 'Futuristic', 'Corporate', '3D'],
    featured: true,
  },
  {
    id: 'education-students',
    label: 'Education & Students',
    group: 'Education & Careers',
    subcategories: [
      'School Students', 'College Students', 'University Students', 'Teachers', 'Professors',
      'Educational Institutions', 'Assignments', 'Study Notes', 'Project Reports', 'Certificates',
      'Timetables', 'Study Planners', 'Presentation Templates', 'Worksheets', 'Academic Posters',
      'Resume Templates',
    ],
    designStyles: ['Educational', 'Creative', 'Minimalist', 'Colorful', 'Professional', 'Modern'],
    featured: true,
  },
  {
    id: 'business-professional',
    label: 'Business',
    group: 'Work & Business',
    subcategories: [
      'Entrepreneurs', 'Startups', 'Small Businesses', 'Corporate Teams', 'Marketing Agencies',
      'Freelancers', 'Consultants', 'Real Estate', 'Finance', 'Healthcare', 'Restaurants',
      'Business Cards', 'Business Proposals', 'Marketing Materials',
    ],
    designStyles: ['Professional', 'Corporate', 'Modern', 'Minimalist', 'Luxury', 'Elegant'],
    featured: true,
  },
  {
    id: 'creative-professionals',
    label: 'Creative',
    group: 'Creative Work',
    subcategories: [
      'Graphic Designers', 'Photographers', 'Content Creators', 'YouTubers', 'Influencers',
      'Video Editors', 'Artists', 'Portfolio Designs', 'Creative Presentations',
    ],
    designStyles: ['Creative', 'Abstract', 'Modern', 'Colorful', 'Geometric', '3D'],
    featured: true,
  },
  {
    id: 'personal',
    label: 'Personal',
    group: 'Personal',
    subcategories: [
      'Birthday', 'Wedding', 'Anniversary', 'Invitations', 'Family Events', 'Travel',
      'Personal Branding', 'Greeting Cards', 'Event Posters',
    ],
    designStyles: ['Elegant', 'Creative', 'Colorful', 'Vintage', 'Modern', 'Luxury'],
    featured: true,
  },
]

export const TEMPLATE_CATEGORY_BY_ID = new Map(
  TEMPLATE_CATEGORIES.map((category) => [category.id, category]),
)