import { useState } from 'react'
import * as SliderPrimitive from '@radix-ui/react-slider'
import { DEFAULT_PREFS } from '../../lib/recommender'
import './Onboarding.css'

const QUESTIONS = [
  {
    key: 'actionVsStrategy',
    label: 'Play Style',
    question: 'How do you like to play?',
    leftLabel: 'Deep Strategy',
    rightLabel: 'Pure Action',
    description: 'Slow tactical thinking vs fast-paced combat',
  },
  {
    key: 'rpgDepth',
    label: 'RPG Interest',
    question: 'How much do you love RPGs?',
    leftLabel: 'Not for me',
    rightLabel: 'Love them',
    description: 'Character builds, story-driven RPGs, skill trees',
  },
  {
    key: 'horror',
    label: 'Horror & Thriller',
    question: 'How do you feel about horror?',
    leftLabel: 'Avoid it',
    rightLabel: 'Love it',
    description: 'Survival horror, psychological thrillers, dark atmosphere',
  },
  {
    key: 'simulation',
    label: 'Simulation & Building',
    question: 'Do you enjoy building and managing things?',
    leftLabel: 'Not really',
    rightLabel: 'Love it',
    description: 'City builders, farming sims, base building, management games',
  },
  {
    key: 'soloVsMulti',
    label: 'Multiplayer',
    question: 'Solo adventures or playing with others?',
    leftLabel: 'Solo only',
    rightLabel: 'Multiplayer',
    description: 'Single-player story vs online multiplayer / co-op',
  },
  {
    key: 'shortVsLong',
    label: 'Game Length',
    question: 'How long do you want your games?',
    leftLabel: 'Short & sweet',
    rightLabel: 'Hundreds of hours',
    description: '2–5 hour experiences vs massive open worlds',
  },
  {
    key: 'difficulty',
    label: 'Difficulty',
    question: 'How hard should your games be?',
    leftLabel: 'Casual & relaxing',
    rightLabel: 'Punishing challenge',
    description: 'Chill games vs souls-likes and brutal challenges',
  },
  {
    key: 'priceSensitivity',
    label: 'Budget',
    question: 'How do you feel about game prices?',
    leftLabel: 'Free only',
    rightLabel: 'Price is no issue',
    description: 'Free-to-play only vs happy to buy premium games',
  },
]

function SliderQuestion({ question, value, onChange }) {
  return (
    <div className="slider-question">
      <div className="sq-header">
        <span className="sq-label">{question.label}</span>
        <h3 className="sq-question">{question.question}</h3>
        <p className="sq-desc">{question.description}</p>
      </div>
      <div className="sq-slider-row">
        <span className="sq-endpoint">
          <span className="sq-end-label">{question.leftLabel}</span>
        </span>
        <SliderPrimitive.Root
          className="slider-root"
          min={0}
          max={10}
          step={1}
          value={[value]}
          onValueChange={([v]) => onChange(v)}
        >
          <SliderPrimitive.Track className="slider-track">
            <SliderPrimitive.Range className="slider-range" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb className="slider-thumb" aria-label={question.label} />
        </SliderPrimitive.Root>
        <span className="sq-endpoint sq-endpoint-right">
          <span className="sq-end-label">{question.rightLabel}</span>
        </span>
      </div>
      <div className="sq-value-indicator">
        {[0,1,2,3,4,5,6,7,8,9,10].map(n => (
          <div
            key={n}
            className={`sq-pip ${n === value ? 'sq-pip-active' : ''}`}
            onClick={() => onChange(n)}
          />
        ))}
      </div>
    </div>
  )
}

export default function Onboarding({ onComplete, onSkip }) {
  const [prefs, setPrefs] = useState({ ...DEFAULT_PREFS })
  const [step, setStep] = useState(0) // 0 = welcome, 1..8 = questions, 9 = done

  const totalSteps = QUESTIONS.length
  const isWelcome = step === 0
  const isDone = step > totalSteps
  const currentQuestion = QUESTIONS[step - 1]

  function handleChange(key, value) {
    setPrefs(p => ({ ...p, [key]: value }))
  }

  function handleNext() {
    if (step <= totalSteps) setStep(s => s + 1)
  }

  function handleBack() {
    if (step > 0) setStep(s => s - 1)
  }

  function handleFinish() {
    onComplete(prefs)
  }

  if (isWelcome) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-welcome">
          <h1>Find Your Next Favorite Game</h1>
          <p>Answer 8 quick questions and we&apos;ll recommend Steam games tailored to your taste.</p>
          <p className="welcome-sub">Takes about 1 minute. Your preferences are saved to your profile.</p>
          <div className="welcome-actions">
            <button className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
              Let&apos;s Go →
            </button>
            <button className="btn btn-ghost" onClick={onSkip}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (step > totalSteps) {
    return (
      <div className="onboarding-screen">
        <div className="onboarding-welcome">
          <h1>You&apos;re all set!</h1>
          <p>We&apos;ve got your preferences. Time to find some great games.</p>
          <button className="btn btn-primary btn-lg" onClick={handleFinish}>
            See My Recommendations →
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="onboarding-screen">
      <div className="onboarding-container">
        <div className="onboarding-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${((step - 1) / totalSteps) * 100}%` }}
            />
          </div>
          <span className="progress-label">{step} / {totalSteps}</span>
        </div>

        <SliderQuestion
          question={currentQuestion}
          value={prefs[currentQuestion.key]}
          onChange={v => handleChange(currentQuestion.key, v)}
        />

        <div className="onboarding-nav">
          <button className="btn btn-ghost" onClick={handleBack}>
            ← Back
          </button>
          <button className="btn btn-primary" onClick={handleNext}>
            {step === totalSteps ? 'Finish' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
