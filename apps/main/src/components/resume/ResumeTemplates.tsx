import React from 'react';
import { cn } from '@/lib/utils';

// Types for resume data
export interface ResumeExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  achievements: string[];
}

export interface ResumeEducation {
  id: string;
  institution: string;
  degree: string;
  field: string;
  location: string;
  graduationDate: string;
  gpa?: string;
  honors?: string;
}

export interface ResumeCertification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url?: string;
}

export interface ResumeProject {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export interface ResumeData {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
  photoUrl?: string;
  summary: string;
  experience: ResumeExperience[];
  education: ResumeEducation[];
  skills: string[];
  certifications: ResumeCertification[];
  projects: ResumeProject[];
  languages: { language: string; proficiency: string }[];
}

interface TemplateProps {
  data: ResumeData;
  className?: string;
}

// ============================================
// TEMPLATE 1: Harvard Classic
// Single column, serif font, minimal - Best for Law, Finance, Consulting
// ============================================
export const HarvardClassicTemplate: React.FC<TemplateProps> = ({ data, className }) => {
  return (
    <div className={cn("bg-white text-black p-8 font-serif max-w-[8.5in] mx-auto", className)}>
      {/* Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-bold tracking-wide uppercase mb-2">{data.fullName}</h1>
        <div className="text-sm space-x-3">
          <span>{data.email}</span>
          <span>•</span>
          <span>{data.phone}</span>
          <span>•</span>
          <span>{data.location}</span>
          {data.linkedinUrl && (
            <>
              <span>•</span>
              <span>LinkedIn</span>
            </>
          )}
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Professional Summary</h2>
          <p className="text-sm leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Experience</h2>
          {data.experience.map((exp) => (
            <div key={exp.id} className="mb-4">
              <div className="flex justify-between items-baseline">
                <h3 className="font-bold">{exp.company}</h3>
                <span className="text-sm">{exp.location}</span>
              </div>
              <div className="flex justify-between items-baseline text-sm italic">
                <span>{exp.position}</span>
                <span>{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
              </div>
              <div className="mt-2 ml-4 text-sm space-y-1">
                {exp.achievements.map((achievement, idx) => (
                  <div key={idx} className="flex items-start">
                    <span className="mr-2" style={{ minWidth: '10px' }}>•</span>
                    <span className="flex-1">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Education</h2>
          {data.education.map((edu) => (
            <div key={edu.id} className="mb-3">
              <div className="flex justify-between items-baseline">
                <h3 className="font-bold">{edu.institution}</h3>
                <span className="text-sm">{edu.graduationDate}</span>
              </div>
              <p className="text-sm">{edu.degree} in {edu.field}</p>
              {edu.gpa && <p className="text-sm">GPA: {edu.gpa}</p>}
              {edu.honors && <p className="text-sm italic">{edu.honors}</p>}
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Skills</h2>
          <p className="text-sm">{data.skills.join(' • ')}</p>
        </section>
      )}

      {/* Certifications */}
      {data.certifications.length > 0 && (
        <section className="mb-6">
          <h2 className="text-lg font-bold uppercase tracking-wider border-b border-gray-300 pb-1 mb-3">Certifications</h2>
          <div className="text-sm space-y-1">
            {data.certifications.map((cert) => (
              <div key={cert.id}>{cert.name} – {cert.issuer} ({cert.date})</div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

// ============================================
// TEMPLATE 2: Modern Professional
// Two columns, clean sans-serif - Best for Tech, Marketing, Design
// ============================================
export const ModernProfessionalTemplate: React.FC<TemplateProps> = ({ data, className }) => {
  return (
    <div className={cn("bg-white text-gray-800 p-8 font-sans max-w-[8.5in] mx-auto", className)}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-4xl font-light tracking-tight text-gray-900">{data.fullName}</h1>
        <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-600">
          <span>{data.email}</span>
          <span>•</span>
          <span>{data.phone}</span>
          <span>•</span>
          <span>{data.location}</span>
          {data.linkedinUrl && (
            <>
              <span>•</span>
              <span>{data.linkedinUrl}</span>
            </>
          )}
          {data.portfolioUrl && (
            <>
              <span>•</span>
              <span>{data.portfolioUrl}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-8">
        {/* Main Column */}
        <div className="flex-1">
          {/* Summary */}
          {data.summary && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-2">About</h2>
              <p className="text-sm leading-relaxed text-gray-700">{data.summary}</p>
            </section>
          )}

          {/* Experience */}
          {data.experience.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-3">Experience</h2>
              {data.experience.map((exp) => (
                <div key={exp.id} className="mb-5">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">{exp.position}</h3>
                      <p className="text-sm text-gray-600">{exp.company} | {exp.location}</p>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded inline-flex items-center justify-center">
                      {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 space-y-1">
                    {exp.achievements.map((achievement, idx) => (
                      <div key={idx} className="flex items-start gap-2">
                        <span className="text-blue-500 mt-1.5">▸</span>
                        <span className="flex-1">{achievement}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </section>
          )}

          {/* Projects */}
          {data.projects.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-3">Projects</h2>
              {data.projects.map((project) => (
                <div key={project.id} className="mb-3">
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  <p className="text-sm text-gray-700">{project.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{project.technologies.join(', ')}</p>
                </div>
              ))}
            </section>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-56">
          {/* Skills */}
          {data.skills.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-3">Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {data.skills.map((skill, idx) => (
                  <span key={idx} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded inline-flex items-center justify-center">
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Education */}
          {data.education.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-3">Education</h2>
              {data.education.map((edu) => (
                <div key={edu.id} className="mb-3">
                  <h3 className="font-semibold text-sm text-gray-900">{edu.institution}</h3>
                  <p className="text-xs text-gray-600">{edu.degree}</p>
                  <p className="text-xs text-gray-500">{edu.graduationDate}</p>
                </div>
              ))}
            </section>
          )}

          {/* Certifications */}
          {data.certifications.length > 0 && (
            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-3">Certifications</h2>
              {data.certifications.map((cert) => (
                <div key={cert.id} className="mb-2">
                  <p className="text-sm font-medium text-gray-900">{cert.name}</p>
                  <p className="text-xs text-gray-500">{cert.issuer}</p>
                </div>
              ))}
            </section>
          )}

          {/* Languages */}
          {data.languages.length > 0 && (
            <section>
              <h2 className="text-sm font-bold uppercase tracking-wider text-blue-600 mb-3">Languages</h2>
              {data.languages.map((lang, idx) => (
                <p key={idx} className="text-sm text-gray-700">
                  {lang.language} – <span className="text-gray-500">{lang.proficiency}</span>
                </p>
              ))}
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// TEMPLATE 3: Executive
// Bold headers, achievement-focused - Best for Senior roles, Management
// ============================================
export const ExecutiveTemplate: React.FC<TemplateProps> = ({ data, className }) => {
  return (
    <div className={cn("bg-white text-gray-900 p-8 font-sans max-w-[8.5in] mx-auto", className)}>
      {/* Header */}
      <div className="bg-slate-900 text-white p-6 -mx-8 -mt-8 mb-6">
        <h1 className="text-4xl font-bold mb-2">{data.fullName}</h1>
        <div className="flex flex-wrap gap-6 text-sm text-slate-300">
          <span>{data.email}</span>
          <span>{data.phone}</span>
          <span>{data.location}</span>
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-amber-500"></span>
            EXECUTIVE SUMMARY
          </h2>
          <p className="text-sm leading-relaxed text-gray-700 pl-10">{data.summary}</p>
        </section>
      )}

      {/* Key Achievements Highlight */}
      {data.experience.length > 0 && data.experience[0].achievements.length > 0 && (
        <section className="mb-8 bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
          <h2 className="text-lg font-bold text-slate-900 mb-2">KEY ACHIEVEMENTS</h2>
          <div className="text-sm text-gray-700 space-y-1">
            {data.experience.slice(0, 2).flatMap(exp => exp.achievements.slice(0, 2)).map((achievement, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-amber-600 font-bold">✓</span>
                <span className="flex-1">{achievement}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-amber-500"></span>
            PROFESSIONAL EXPERIENCE
          </h2>
          {data.experience.map((exp) => (
            <div key={exp.id} className="mb-6 pl-10">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">{exp.position}</h3>
                  <p className="text-sm font-semibold text-amber-600">{exp.company}</p>
                </div>
                <div className="text-right text-sm text-gray-600">
                  <p>{exp.location}</p>
                  <p>{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</p>
                </div>
              </div>
              <div className="text-sm text-gray-700 space-y-1 mt-2">
                {exp.achievements.map((achievement, idx) => (
                  <div key={idx} className="flex items-start gap-2">
                    <span className="text-slate-400">▪</span>
                    <span className="flex-1">{achievement}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      )}

      <div className="grid grid-cols-2 gap-8">
        {/* Education */}
        {data.education.length > 0 && (
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span className="w-8 h-0.5 bg-amber-500"></span>
              EDUCATION
            </h2>
            {data.education.map((edu) => (
              <div key={edu.id} className="mb-3 pl-10">
                <h3 className="font-bold text-slate-900">{edu.degree}</h3>
                <p className="text-sm text-gray-600">{edu.institution}</p>
                <p className="text-xs text-gray-500">{edu.graduationDate}</p>
              </div>
            ))}
          </section>
        )}

        {/* Skills & Certifications */}
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
            <span className="w-8 h-0.5 bg-amber-500"></span>
            CORE COMPETENCIES
          </h2>
          <div className="pl-10 flex flex-wrap gap-2">
            {data.skills.map((skill, idx) => (
              <span key={idx} className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full font-medium">
                {skill}
              </span>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
};

// ============================================
// TEMPLATE 4: Minimalist
// Maximum whitespace, ATS-optimized - Best for Any industry
// ============================================
export const MinimalistTemplate: React.FC<TemplateProps> = ({ data, className }) => {
  return (
    <div className={cn("bg-white text-gray-800 p-10 font-sans max-w-[8.5in] mx-auto", className)}>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-light tracking-tight mb-1">{data.fullName}</h1>
        <div className="text-sm text-gray-500 space-x-2">
          <span>{data.email}</span>
          <span>|</span>
          <span>{data.phone}</span>
          <span>|</span>
          <span>{data.location}</span>
        </div>
      </div>

      {/* Summary */}
      {data.summary && (
        <section className="mb-8">
          <p className="text-sm text-gray-600 leading-relaxed">{data.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Experience</h2>
          {data.experience.map((exp) => (
            <div key={exp.id} className="mb-6">
              <div className="flex justify-between items-baseline mb-1">
                <span className="font-medium">{exp.position}</span>
                <span className="text-sm text-gray-500">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
              </div>
              <p className="text-sm text-gray-500 mb-2">{exp.company}, {exp.location}</p>
              <ul className="text-sm text-gray-600 space-y-1">
                {exp.achievements.map((achievement, idx) => (
                  <li key={idx}>• {achievement}</li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Education</h2>
          {data.education.map((edu) => (
            <div key={edu.id} className="flex justify-between items-baseline mb-2">
              <div>
                <span className="font-medium">{edu.degree}</span>
                <span className="text-gray-500"> — {edu.institution}</span>
              </div>
              <span className="text-sm text-gray-500">{edu.graduationDate}</span>
            </div>
          ))}
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Skills</h2>
          <p className="text-sm text-gray-600">{data.skills.join(' · ')}</p>
        </section>
      )}

      {/* Certifications */}
      {data.certifications.length > 0 && (
        <section>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Certifications</h2>
          <p className="text-sm text-gray-600">
            {data.certifications.map(c => c.name).join(' · ')}
          </p>
        </section>
      )}
    </div>
  );
};

// ============================================
// TEMPLATE 5: Creative Corporate
// Subtle accent colors, icons - Best for Startups, Creative roles
// ============================================
export const CreativeCorporateTemplate: React.FC<TemplateProps> = ({ data, className }) => {
  return (
    <div className={cn("bg-white text-gray-800 max-w-[8.5in] mx-auto", className)}>
      {/* Header with accent */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-8">
        <h1 className="text-4xl font-bold mb-2">{data.fullName}</h1>
        <div className="flex flex-wrap gap-6 text-sm text-violet-100">
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {data.email}
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            {data.phone}
          </span>
          <span className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {data.location}
          </span>
        </div>
      </div>

      <div className="p-8">
        {/* Summary */}
        {data.summary && (
          <section className="mb-8 p-4 bg-violet-50 rounded-lg border-l-4 border-violet-500">
            <p className="text-sm text-gray-700 leading-relaxed">{data.summary}</p>
          </section>
        )}

        <div className="grid grid-cols-3 gap-8">
          {/* Main Column - 2/3 */}
          <div className="col-span-2">
            {/* Experience */}
            {data.experience.length > 0 && (
              <section className="mb-8">
                <h2 className="text-lg font-bold text-violet-600 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Experience
                </h2>
                {data.experience.map((exp) => (
                  <div key={exp.id} className="mb-5 relative pl-4 border-l-2 border-violet-200">
                    <div className="absolute -left-1.5 top-0 w-3 h-3 bg-violet-500 rounded-full"></div>
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-900">{exp.position}</h3>
                        <p className="text-sm text-violet-600">{exp.company}</p>
                      </div>
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                        {exp.startDate} – {exp.current ? 'Present' : exp.endDate}
                      </span>
                    </div>
                    <ul className="mt-2 text-sm text-gray-600 space-y-1">
                      {exp.achievements.map((achievement, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-violet-400">→</span>
                          {achievement}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </section>
            )}

            {/* Projects */}
            {data.projects.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-violet-600 mb-4 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  Projects
                </h2>
                {data.projects.map((project) => (
                  <div key={project.id} className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <h3 className="font-semibold text-gray-900">{project.name}</h3>
                    <p className="text-sm text-gray-600 mt-1">{project.description}</p>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {project.technologies.map((tech, idx) => (
                        <span key={idx} className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded">
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </section>
            )}
          </div>

          {/* Sidebar - 1/3 */}
          <div>
            {/* Skills */}
            {data.skills.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-violet-600 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Skills
                </h2>
                <div className="flex flex-wrap gap-1.5">
                  {data.skills.map((skill, idx) => (
                    <span key={idx} className="text-xs bg-gradient-to-r from-violet-100 to-indigo-100 text-violet-700 px-2 py-1 rounded-full">
                      {skill}
                    </span>
                  ))}
                </div>
              </section>
            )}

            {/* Education */}
            {data.education.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-violet-600 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14zm-4 6v-7.5l4-2.222" />
                  </svg>
                  Education
                </h2>
                {data.education.map((edu) => (
                  <div key={edu.id} className="mb-3">
                    <h3 className="font-semibold text-sm text-gray-900">{edu.degree}</h3>
                    <p className="text-xs text-gray-600">{edu.institution}</p>
                    <p className="text-xs text-gray-500">{edu.graduationDate}</p>
                  </div>
                ))}
              </section>
            )}

            {/* Certifications */}
            {data.certifications.length > 0 && (
              <section className="mb-6">
                <h2 className="text-lg font-bold text-violet-600 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  Certifications
                </h2>
                {data.certifications.map((cert) => (
                  <div key={cert.id} className="mb-2">
                    <p className="text-sm font-medium text-gray-900">{cert.name}</p>
                    <p className="text-xs text-gray-500">{cert.issuer} • {cert.date}</p>
                  </div>
                ))}
              </section>
            )}

            {/* Languages */}
            {data.languages.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-violet-600 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                  </svg>
                  Languages
                </h2>
                {data.languages.map((lang, idx) => (
                  <div key={idx} className="flex justify-between text-sm mb-1">
                    <span className="text-gray-700">{lang.language}</span>
                    <span className="text-gray-500">{lang.proficiency}</span>
                  </div>
                ))}
              </section>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Template registry for easy access
export const RESUME_TEMPLATES = [
  {
    id: 'harvard-classic',
    name: 'Harvard Classic',
    description: 'Single column, serif font, minimal',
    bestFor: 'Law, Finance, Consulting',
    component: HarvardClassicTemplate,
    preview: '/templates/harvard-classic.png',
  },
  {
    id: 'modern-professional',
    name: 'Modern Professional',
    description: 'Two columns, clean sans-serif',
    bestFor: 'Tech, Marketing, Design',
    component: ModernProfessionalTemplate,
    preview: '/templates/modern-professional.png',
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Maximum whitespace, ATS-optimized',
    bestFor: 'Any industry',
    component: MinimalistTemplate,
    preview: '/templates/minimalist.png',
  },
];

// Default empty resume data
export const EMPTY_RESUME_DATA: ResumeData = {
  fullName: '',
  email: '',
  phone: '',
  location: '',
  linkedinUrl: '',
  portfolioUrl: '',
  photoUrl: '',
  summary: '',
  experience: [],
  education: [],
  skills: [],
  certifications: [],
  projects: [],
  languages: [],
};

// Sample resume data for Harvard Classic (Law/Finance/Consulting) - 1 PAGE
export const SAMPLE_HARVARD_CLASSIC: ResumeData = {
  fullName: 'Alexandra Chen',
  email: 'alexandra.chen@email.com',
  phone: '(617) 555-0123',
  location: 'Boston, MA',
  linkedinUrl: 'linkedin.com/in/alexandrachen',
  portfolioUrl: '',
  photoUrl: '',
  summary: 'Corporate Attorney with 8+ years of experience in M&A transactions, securities law, and corporate governance. Successfully led due diligence for $2.5B+ in transactions. Harvard Law School graduate with proven track record delivering strategic legal counsel to Fortune 500 clients.',
  experience: [
    {
      id: '1',
      company: 'Sullivan & Cromwell LLP',
      position: 'Senior Associate - Corporate',
      location: 'New York, NY',
      startDate: 'Sep 2019',
      endDate: '',
      current: true,
      achievements: [
        'Lead counsel on 15+ M&A transactions totaling over $2.5 billion in aggregate deal value',
        'Managed cross-border securities offerings including $500M bond issuance for multinational corporation',
        'Developed enhanced due diligence protocols reducing review time by 30%',
        'Mentored 8 junior associates on corporate transactions and regulatory compliance',
      ],
    },
    {
      id: '2',
      company: 'Skadden, Arps, Slate, Meagher & Flom',
      position: 'Associate - Mergers & Acquisitions',
      location: 'Boston, MA',
      startDate: 'Aug 2016',
      endDate: 'Aug 2019',
      current: false,
      achievements: [
        'Drafted and negotiated commercial agreements for private equity transactions valued at $50M-$500M',
        'Conducted SEC compliance reviews for quarterly and annual filings for 15+ public companies',
        'Collaborated with international teams on cross-border restructuring matters',
        'Assisted in successful defense of hostile takeover attempt for Fortune 500 client',
      ],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Harvard Law School',
      degree: 'Juris Doctor',
      field: 'Law',
      location: 'Cambridge, MA',
      graduationDate: 'May 2016',
      gpa: '3.8/4.0',
      honors: 'Magna Cum Laude, Law Review Editor',
    },
    {
      id: '2',
      institution: 'Yale University',
      degree: 'Bachelor of Arts',
      field: 'Economics',
      location: 'New Haven, CT',
      graduationDate: 'May 2013',
      gpa: '3.9/4.0',
      honors: 'Summa Cum Laude, Phi Beta Kappa',
    },
  ],
  skills: ['M&A Transactions', 'Securities Law', 'Corporate Governance', 'Due Diligence', 'Contract Negotiation', 'Regulatory Compliance', 'Legal Research', 'Westlaw', 'LexisNexis', 'SEC Filings'],
  certifications: [
    { id: '1', name: 'New York State Bar', issuer: 'NY Bar Association', date: '2016' },
    { id: '2', name: 'Massachusetts State Bar', issuer: 'MA Bar Association', date: '2016' },
  ],
  projects: [],
  languages: [
    { language: 'English', proficiency: 'Native' },
    { language: 'Mandarin Chinese', proficiency: 'Fluent' },
  ],
};

// Sample resume data for Modern Professional (Tech/Marketing/Design) - 1 PAGE
export const SAMPLE_MODERN_PROFESSIONAL: ResumeData = {
  fullName: 'Jordan Rivera',
  email: 'jordan.rivera@email.com',
  phone: '(415) 555-0456',
  location: 'San Francisco, CA',
  linkedinUrl: 'linkedin.com/in/jordanrivera',
  portfolioUrl: 'jordanrivera.design',
  photoUrl: '',
  summary: 'Senior Product Designer with 6+ years of experience creating user-centered digital experiences for B2B SaaS platforms. Led design for products serving 2M+ users. Passionate about design systems, accessibility, and converting complex workflows into intuitive interfaces.',
  experience: [
    {
      id: '1',
      company: 'Figma',
      position: 'Senior Product Designer',
      location: 'San Francisco, CA',
      startDate: 'Mar 2021',
      endDate: '',
      current: true,
      achievements: [
        'Redesigned collaboration features increasing team adoption by 45% and improving NPS from 32 to 58',
        'Built and maintained design system with 200+ components used across 20+ product surfaces',
        'Led accessibility initiative achieving WCAG 2.1 AA compliance for core features',
        'Mentored 4 junior designers and established weekly design critique program',
      ],
    },
    {
      id: '2',
      company: 'Slack',
      position: 'Product Designer',
      location: 'San Francisco, CA',
      startDate: 'Jun 2018',
      endDate: 'Feb 2021',
      current: false,
      achievements: [
        'Designed enterprise admin dashboard serving 500K+ organizations',
        'Led redesign of Slack Connect reducing setup time from 15 minutes to under 3 minutes',
        'Created onboarding experience reducing time-to-value by 35%',
        'Partnered with engineering to implement design token system',
      ],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'Rhode Island School of Design',
      degree: 'Bachelor of Fine Arts',
      field: 'Graphic Design',
      location: 'Providence, RI',
      graduationDate: 'May 2018',
      gpa: '3.7/4.0',
      honors: "Dean's List, Industrial Design Award",
    },
  ],
  skills: ['Figma', 'Sketch', 'Adobe Creative Suite', 'Prototyping', 'User Research', 'Design Systems', 'Accessibility', 'HTML/CSS', 'Framer', 'Information Architecture'],
  certifications: [
    { id: '1', name: 'Google UX Design Certificate', issuer: 'Google', date: '2020' },
  ],
  projects: [
    {
      id: '1',
      name: 'DesignOps Framework',
      description: 'Open-source design operations framework adopted by 50+ design teams',
      technologies: ['Figma', 'Notion', 'GitHub'],
      url: 'github.com/designops-framework',
    },
  ],
  languages: [
    { language: 'English', proficiency: 'Native' },
    { language: 'Spanish', proficiency: 'Conversational' },
  ],
};

// Sample resume data for Minimalist (Any industry - New grad example) - 1 PAGE
export const SAMPLE_MINIMALIST: ResumeData = {
  fullName: 'Sarah Kim',
  email: 'sarah.kim@email.com',
  phone: '(213) 555-0321',
  location: 'Los Angeles, CA',
  linkedinUrl: 'linkedin.com/in/sarahkim',
  portfolioUrl: 'github.com/sarahkim-dev',
  photoUrl: '',
  summary: 'Recent Computer Science graduate with strong foundation in software development and cloud computing. Completed internships at Google and Microsoft with "Exceeds Expectations" ratings. Passionate about building scalable systems and contributing to open-source projects.',
  experience: [
    {
      id: '1',
      company: 'Google',
      position: 'Software Engineering Intern',
      location: 'Mountain View, CA',
      startDate: 'Jun 2023',
      endDate: 'Aug 2023',
      current: false,
      achievements: [
        'Developed internal tool for code review automation, reducing review time by 20%',
        'Implemented REST API endpoints in Go serving 10K+ requests per minute',
        'Collaborated with team of 8 engineers on Google Cloud Platform features',
        'Presented project results to 50+ engineers at intern showcase',
      ],
    },
    {
      id: '2',
      company: 'Microsoft',
      position: 'Software Engineering Intern',
      location: 'Redmond, WA',
      startDate: 'Jun 2022',
      endDate: 'Aug 2022',
      current: false,
      achievements: [
        'Built real-time data pipeline processing 1M+ daily events for Azure analytics',
        'Designed dashboard visualization components viewed by 10K+ customers monthly',
        'Wrote comprehensive unit tests achieving 95% code coverage',
        'Received "Exceeds Expectations" performance rating',
      ],
    },
  ],
  education: [
    {
      id: '1',
      institution: 'University of Southern California',
      degree: 'Bachelor of Science',
      field: 'Computer Science',
      location: 'Los Angeles, CA',
      graduationDate: 'May 2024',
      gpa: '3.85/4.0',
      honors: "Dean's List, CS Department Award",
    },
  ],
  skills: ['Python', 'Java', 'Go', 'JavaScript', 'React', 'Node.js', 'SQL', 'Git', 'AWS', 'Docker'],
  certifications: [
    { id: '1', name: 'AWS Certified Cloud Practitioner', issuer: 'Amazon Web Services', date: '2023' },
  ],
  projects: [
    {
      id: '1',
      name: 'Campus Event Finder',
      description: 'Full-stack mobile app connecting students with campus events, 5K+ downloads',
      technologies: ['React Native', 'Firebase', 'Node.js'],
    },
  ],
  languages: [
    { language: 'English', proficiency: 'Native' },
    { language: 'Korean', proficiency: 'Fluent' },
  ],
};

// Map template IDs to their sample data
export const TEMPLATE_SAMPLES: Record<string, ResumeData> = {
  'harvard-classic': SAMPLE_HARVARD_CLASSIC,
  'modern-professional': SAMPLE_MODERN_PROFESSIONAL,
  'minimalist': SAMPLE_MINIMALIST,
};
