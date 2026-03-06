'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Trophy, Loader2, Star, Zap, Footprints, Heart, Shield, Target, HelpCircle, Users, Check } from 'lucide-react'
import LivePhotoCapture from '@/components/LivePhotoCapture'

interface SkillRatingProps {
  name: string
  value: number
  icon: React.ReactNode
  description: string
  onChange: (value: number) => void
}

function SkillRating({ name, value, icon, description, onChange }: SkillRatingProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">{icon}</span>
          <span className="font-medium">{name}</span>
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => onChange(star)}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={`w-5 h-5 ${
                  star <= value
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-white/10 text-white/20'
                }`}
              />
            </button>
          ))}
          <span className="ml-2 text-sm font-mono text-cyan-400">{value}</span>
        </div>
      </div>
      <p className="text-xs text-white/40">{description}</p>
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    photoUrl: '',
    photoVerified: false,
    isGoalie: false,
    isFreeAgent: false,
    // Skill ratings (1-5)
    skillSpeed: 3,
    skillTechnical: 3,
    skillStamina: 3,
    skillTeamwork: 3,
    skillDefense: 3,
    skillAttack: 3,
    discountCode: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showSkills, setShowSkills] = useState(false)
  const [discountError, setDiscountError] = useState('')
  const [discountValid, setDiscountValid] = useState(false)
  const [discountLoading, setDiscountLoading] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }))
  }

  const handleSkillChange = (skill: string, value: number) => {
    setFormData((prev) => ({ ...prev, [skill]: value }))
  }

  const handlePhotoCapture = (photoData: string) => {
    setFormData((prev) => ({ ...prev, photoUrl: photoData }))
  }
  const handlePhotoVerified = (verified: boolean) => {
    setFormData((prev) => ({ ...prev, photoVerified: verified }))
  }

  const validateDiscount = async () => {
    if (!formData.discountCode.trim()) return
    
    setDiscountLoading(true)
    setDiscountError('')
    setDiscountValid(false)
    
    try {
      const res = await fetch(`/api/discounts?code=${formData.discountCode}`)
      const data = await res.json()
      
      if (data.valid) {
        setDiscountValid(true)
      } else {
        setDiscountError(data.error || 'Invalid code')
      }
    } catch (err) {
      setDiscountError('Failed to validate code')
    }
    
    setDiscountLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    // Photo is required for registration
    if (!formData.photoUrl || !formData.photoVerified) {
      setError('A verified photo is required for registration')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          photoUrl: formData.photoUrl,
        photoVerified: formData.photoVerified,
          isGoalie: formData.isGoalie,
          isFreeAgent: formData.isFreeAgent,
          skillSpeed: formData.skillSpeed,
          skillTechnical: formData.skillTechnical,
          skillStamina: formData.skillStamina,
          skillTeamwork: formData.skillTeamwork,
          skillDefense: formData.skillDefense,
          skillAttack: formData.skillAttack,
          discountCode: discountValid ? formData.discountCode : null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed')
      } else {
        router.push('/login?registered=true')
      }
    } catch {
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const skills = [
    { 
      key: 'skillSpeed', 
      name: 'Speed', 
      icon: <Zap className="w-4 h-4" />,
      description: 'How fast you can run and accelerate on the field'
    },
    { 
      key: 'skillTechnical', 
      name: 'Technical', 
      icon: <HelpCircle className="w-4 h-4" />,
      description: 'Ball control, passing accuracy, and technical skills'
    },
    { 
      key: 'skillStamina', 
      name: 'Stamina', 
      icon: <Heart className="w-4 h-4" />,
      description: 'Endurance to maintain performance throughout the game'
    },
    { 
      key: 'skillTeamwork', 
      name: 'Teamwork', 
      icon: <Users className="w-4 h-4" />,
      description: 'Communication, positioning, and ability to work with teammates'
    },
    { 
      key: 'skillDefense', 
      name: 'Defense', 
      icon: <Shield className="w-4 h-4" />,
      description: 'Tackling, marking, and defensive positioning'
    },
    { 
      key: 'skillAttack', 
      name: 'Attack', 
      icon: <Target className="w-4 h-4" />,
      description: 'Finishing, dribbling, and offensive playmaking'
    },
  ]

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold glow-text">League OS</span>
          </Link>
          <h1 className="text-3xl font-bold mb-2">Join the League</h1>
          <p className="text-muted-foreground">Create your account</p>
        </div>

        <div className="glass-card rounded-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/50 text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Photo - Required for registration */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Photo <span className="text-red-400">* Required</span>
              </label>
              <p className="text-white/50 text-xs mb-3">
                A clear photo is required for player ID verification and league records.
              </p>
              <LivePhotoCapture onCapture={handlePhotoCapture} onVerified={handlePhotoVerified} required={true} />
              {!formData.photoUrl && (
                <p className="text-red-400 text-xs mt-2">Please capture and verify a photo to continue</p>
              )}
            </div>

            <div>
              <label htmlFor="fullName" className="block text-sm font-medium mb-2">
                Full Name
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors text-white"
                placeholder="John Doe"
                required
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors text-white"
                placeholder="you@example.com"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium mb-2">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors text-white"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 focus:border-cyan-400 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-colors text-white"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Player Preferences */}
            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Trophy className="w-5 h-5 text-cyan-400" />
                Player Preferences
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-cyan-400/50 transition-colors">
                  <input
                    type="checkbox"
                    name="isGoalie"
                    checked={formData.isGoalie}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-white/30 bg-white/5 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-0"
                  />
                  <div>
                    <span className="font-medium">Goalie</span>
                    <p className="text-xs text-white/50">I prefer to play as goalkeeper</p>
                  </div>
                </label>

                <label className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:border-cyan-400/50 transition-colors">
                  <input
                    type="checkbox"
                    name="isFreeAgent"
                    checked={formData.isFreeAgent}
                    onChange={handleChange}
                    className="w-5 h-5 rounded border-white/30 bg-white/5 text-cyan-400 focus:ring-cyan-400 focus:ring-offset-0"
                  />
                  <div>
                    <span className="font-medium">Looking for Team</span>
                    <p className="text-xs text-white/50">Add me to free agent pool</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Skill Matrix Toggle */}
            {!showSkills ? (
              <button
                type="button"
                onClick={() => setShowSkills(true)}
                className="w-full py-3 rounded-lg font-semibold transition-all border border-dashed border-white/20 hover:border-cyan-400 text-white/60 hover:text-cyan-400"
              >
                + Set Your Skill Ratings (Help captains find you)
              </button>
            ) : (
              <div className="space-y-4 pt-4 border-t border-white/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Star className="w-5 h-5 text-yellow-400" />
                    Skill Matrix
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowSkills(false)}
                    className="text-sm text-white/50 hover:text-white"
                  >
                    Collapse
                  </button>
                </div>
                <p className="text-sm text-white/50">
                  Rate yourself 1-5 stars. These help captains evaluate you for their team.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {skills.map((skill) => (
                    <div 
                      key={skill.key}
                      className="p-4 rounded-lg bg-white/5 border border-white/10"
                    >
                      <SkillRating
                        name={skill.name}
                        value={formData[skill.key as keyof typeof formData] as number}
                        icon={skill.icon}
                        description={skill.description}
                        onChange={(value) => handleSkillChange(skill.key, value)}
                      />
                    </div>
                  ))}
                </div>

                {/* Skill Summary */}
                <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <h4 className="font-medium text-cyan-400 mb-2">Your Skill Profile</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span 
                        key={skill.key}
                        className="px-2 py-1 rounded text-xs font-mono bg-white/10"
                      >
                        {skill.name}: {formData[skill.key as keyof typeof formData]}/5
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Discount Code */}
            <div className="glass-card p-4">
              <label className="block text-sm font-medium mb-2 text-white">
                Have a discount code?
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  name="discountCode"
                  value={formData.discountCode}
                  onChange={(e) => {
                    setFormData({ ...formData, discountCode: e.target.value.toUpperCase() })
                    setDiscountValid(false)
                    setDiscountError('')
                  }}
                  className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white placeholder-white/30"
                  placeholder="Enter code"
                />
                <button
                  type="button"
                  onClick={validateDiscount}
                  disabled={!formData.discountCode.trim() || discountLoading}
                  className="btn-secondary"
                >
                  {discountLoading ? 'Checking...' : 'Apply'}
                </button>
              </div>
              {discountValid && (
                <p className="text-green-400 text-sm mt-2 flex items-center gap-1">
                  <Check className="w-4 h-4" /> Discount applied!
                </p>
              )}
              {discountError && (
                <p className="text-red-400 text-sm mt-2">{discountError}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-semibold transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: '#00F5FF', color: '#121212' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <Link href="/login" className="text-cyan-400 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
