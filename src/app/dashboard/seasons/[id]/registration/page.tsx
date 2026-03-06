'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowLeft, Save, Loader2, Plus, Trash2, GripVertical, 
  Type, AlignLeft, List, CheckSquare, Calendar, Settings,
  DollarSign, Shield, ToggleLeft, ToggleRight, FileText
} from 'lucide-react';

interface CustomField {
  id: string;
  type: 'text' | 'textarea' | 'select' | 'checkbox' | 'date';
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[]; // For select fields
}

interface RegistrationFormData {
  seasonId: string;
  isEnabled: boolean;
  requireInsurance: boolean;
  requireWaiver: boolean;
  waiverText: string;
  baseFee: number;
  earlyBirdFee: number | null;
  lateFee: number | null;
  paymentThankYouSubject: string;
  paymentThankYouBody: string;
  customFields: CustomField[];
}

export default function RegistrationFormBuilder() {
  const router = useRouter();
  const params = useParams();
  const seasonId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<RegistrationFormData>({
    seasonId: seasonId,
    isEnabled: true,
    requireInsurance: true,
    requireWaiver: false,
    waiverText: 'I hereby release the league, its officers, agents, and volunteers from any and all liability for any injury or loss arising from my participation in league activities. I understand that soccer is a contact sport and injuries can occur. I certify that I am in good physical condition to participate in this league and have no medical conditions that would prevent me from playing. I agree to follow all league rules and policies.',
    baseFee: 150,
    earlyBirdFee: null,
    lateFee: null,
    paymentThankYouSubject: '',
    paymentThankYouBody: '',
    customFields: [],
  });

  useEffect(() => {
    fetchFormConfig();
  }, [seasonId]);

  const fetchFormConfig = async () => {
    try {
      const res = await fetch(`/api/registration-form?seasonId=${seasonId}`);
      if (res.ok) {
        const data = await res.json();
        setFormData({
          ...data,
          customFields: data.customFields || [],
          earlyBirdFee: data.earlyBirdFee || null,
          lateFee: data.lateFee || null,
          paymentThankYouSubject: data.paymentThankYouSubject || '',
          paymentThankYouBody: data.paymentThankYouBody || '',
          requireWaiver: data.requireWaiver || false,
          waiverText: data.waiverText || 'I hereby release the league, its officers, agents, and volunteers from any and all liability for any injury or loss arising from my participation in league activities. I understand that soccer is a contact sport and injuries can occur. I certify that I am in good physical condition to participate in this league and have no medical conditions that would prevent me from playing. I agree to follow all league rules and policies.',
        });
      }
    } catch (error) {
      console.error('Failed to fetch form config:', error);
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/registration-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Registration form saved successfully!');
      } else {
        const error = await res.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to save form:', error);
      alert('Failed to save form');
    }
    setSaving(false);
  };

  const addCustomField = (type: CustomField['type']) => {
    const newField: CustomField = {
      id: `field-${Date.now()}`,
      type,
      label: '',
      placeholder: '',
      required: false,
      options: type === 'select' ? ['Option 1', 'Option 2'] : undefined,
    };
    setFormData({
      ...formData,
      customFields: [...formData.customFields, newField],
    });
  };

  const updateCustomField = (id: string, updates: Partial<CustomField>) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.map(field =>
        field.id === id ? { ...field, ...updates } : field
      ),
    });
  };

  const deleteCustomField = (id: string) => {
    setFormData({
      ...formData,
      customFields: formData.customFields.filter(field => field.id !== id),
    });
  };

  const updateOption = (fieldId: string, optionIndex: number, value: string) => {
    const field = formData.customFields.find(f => f.id === fieldId);
    if (field && field.options) {
      const newOptions = [...field.options];
      newOptions[optionIndex] = value;
      updateCustomField(fieldId, { options: newOptions });
    }
  };

  const addOption = (fieldId: string) => {
    const field = formData.customFields.find(f => f.id === fieldId);
    if (field && field.options) {
      updateCustomField(fieldId, { options: [...field.options, `Option ${field.options.length + 1}`] });
    }
  };

  const removeOption = (fieldId: string, optionIndex: number) => {
    const field = formData.customFields.find(f => f.id === fieldId);
    if (field && field.options && field.options.length > 1) {
      updateCustomField(fieldId, { options: field.options.filter((_, i) => i !== optionIndex) });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="glass-card p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/seasons" className="p-2 hover:bg-white/10 rounded-lg">
              <ArrowLeft className="w-5 h-5 text-white/70" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">Registration Form Builder</h1>
              <p className="text-white/50">Customize the registration form for this season</p>
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Form
          </button>
        </div>

        {/* Registration Settings */}
        <div className="space-y-6">
          {/* Toggle Settings */}
          <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Registration Settings
            </h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium">Enable Registration</label>
                  <p className="text-white/50 text-sm">Allow players to register for this season</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                  className={formData.isEnabled ? 'text-green-400' : 'text-white/30'}
                >
                  {formData.isEnabled ? <ToggleRight className="w-10 h-6" /> : <ToggleLeft className="w-10 h-6" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Require Insurance
                  </label>
                  <p className="text-white/50 text-sm">Players must have valid insurance to register</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, requireInsurance: !formData.requireInsurance })}
                  className={formData.requireInsurance ? 'text-green-400' : 'text-white/30'}
                >
                  {formData.requireInsurance ? <ToggleRight className="w-10 h-6" /> : <ToggleLeft className="w-10 h-6" />}
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-white font-medium flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Require Waiver
                  </label>
                  <p className="text-white/50 text-sm">Players must accept waiver/terms to register</p>
                </div>
                <button
                  onClick={() => setFormData({ ...formData, requireWaiver: !formData.requireWaiver })}
                  className={formData.requireWaiver ? 'text-green-400' : 'text-white/30'}
                >
                  {formData.requireWaiver ? <ToggleRight className="w-10 h-6" /> : <ToggleLeft className="w-10 h-6" />}
                </button>
              </div>

              {formData.requireWaiver && (
                <div className="mt-4">
                  <label className="block text-white/70 mb-1">Waiver Text</label>
                  <textarea
                    value={formData.waiverText}
                    onChange={(e) => setFormData({ ...formData, waiverText: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-32"
                    placeholder="Enter waiver/terms and conditions text..."
                  />
                  <p className="text-white/40 text-xs mt-1">This text will be shown to players during registration</p>
                </div>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Registration Fees
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-white/70 mb-1">Base Fee ($)</label>
                <input
                  type="number"
                  value={formData.baseFee}
                  onChange={(e) => setFormData({ ...formData, baseFee: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Early Bird Fee ($) <span className="text-white/40">(optional)</span></label>
                <input
                  type="number"
                  value={formData.earlyBirdFee || ''}
                  onChange={(e) => setFormData({ ...formData, earlyBirdFee: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Discounted rate"
                  min="0"
                  step="0.01"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Late Fee ($) <span className="text-white/40">(optional)</span></label>
                <input
                  type="number"
                  value={formData.lateFee || ''}
                  onChange={(e) => setFormData({ ...formData, lateFee: e.target.value ? parseFloat(e.target.value) : null })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Penalty rate"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>

          <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Payment Confirmation Email
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-white/70 mb-1">Thank-you Subject</label>
                <input
                  type="text"
                  value={formData.paymentThankYouSubject}
                  onChange={(e) => setFormData({ ...formData, paymentThankYouSubject: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white"
                  placeholder="Thanks for registering with Corridor Soccer"
                />
              </div>
              <div>
                <label className="block text-white/70 mb-1">Thank-you Message</label>
                <textarea
                  value={formData.paymentThankYouBody}
                  onChange={(e) => setFormData({ ...formData, paymentThankYouBody: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-white h-28"
                  placeholder="Thanks for registering. We are excited to have you this season."
                />
                <p className="text-white/40 text-xs mt-1">This message is included in the registration receipt email after successful payment.</p>
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Type className="w-5 h-5" />
                Custom Form Fields
              </h2>
              <div className="flex gap-2">
                <button onClick={() => addCustomField('text')} className="btn-secondary text-sm flex items-center gap-1">
                  <Type className="w-4 h-4" /> Text
                </button>
                <button onClick={() => addCustomField('textarea')} className="btn-secondary text-sm flex items-center gap-1">
                  <AlignLeft className="w-4 h-4" /> Textarea
                </button>
                <button onClick={() => addCustomField('select')} className="btn-secondary text-sm flex items-center gap-1">
                  <List className="w-4 h-4" /> Select
                </button>
                <button onClick={() => addCustomField('checkbox')} className="btn-secondary text-sm flex items-center gap-1">
                  <CheckSquare className="w-4 h-4" /> Checkbox
                </button>
                <button onClick={() => addCustomField('date')} className="btn-secondary text-sm flex items-center gap-1">
                  <Calendar className="w-4 h-4" /> Date
                </button>
              </div>
            </div>

            {formData.customFields.length === 0 ? (
              <div className="text-center py-8 text-white/40">
                <p>No custom fields yet. Add fields above to collect additional information.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {formData.customFields.map((field, index) => (
                  <div key={field.id} className="glass-card p-4 border border-white/10">
                    <div className="flex items-start gap-4">
                      <div className="mt-2 text-white/30 cursor-move">
                        <GripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-white/70 text-sm mb-1">Label *</label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => updateCustomField(field.id, { label: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                              placeholder="Field label"
                            />
                          </div>
                          <div>
                            <label className="block text-white/70 text-sm mb-1">Field Type</label>
                            <select
                              value={field.type}
                              onChange={(e) => updateCustomField(field.id, { type: e.target.value as CustomField['type'] })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="select">Select (Dropdown)</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="date">Date</option>
                            </select>
                          </div>
                        </div>

                        {(field.type === 'text' || field.type === 'textarea' || field.type === 'date') && (
                          <div>
                            <label className="block text-white/70 text-sm mb-1">Placeholder</label>
                            <input
                              type="text"
                              value={field.placeholder || ''}
                              onChange={(e) => updateCustomField(field.id, { placeholder: e.target.value })}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                              placeholder="Placeholder text"
                            />
                          </div>
                        )}

                        {field.type === 'select' && (
                          <div>
                            <label className="block text-white/70 text-sm mb-1">Options</label>
                            <div className="space-y-2">
                              {field.options?.map((option, optIndex) => (
                                <div key={optIndex} className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={option}
                                    onChange={(e) => updateOption(field.id, optIndex, e.target.value)}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white"
                                  />
                                  <button
                                    onClick={() => removeOption(field.id, optIndex)}
                                    className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                              <button
                                onClick={() => addOption(field.id)}
                                className="text-sm text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                              >
                                <Plus className="w-4 h-4" /> Add Option
                              </button>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={field.required}
                              onChange={(e) => updateCustomField(field.id, { required: e.target.checked })}
                              className="w-4 h-4 rounded bg-white/5 border-white/20"
                            />
                            <span className="text-white/70 text-sm">Required field</span>
                          </label>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteCustomField(field.id)}
                        className="p-2 hover:bg-red-500/20 rounded-lg text-red-400"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="glass-card p-4">
            <h2 className="text-lg font-bold text-white mb-4">Form Preview</h2>
            <div className="bg-white/5 rounded-lg p-6 space-y-4">
              {/* Base fields */}
              <div className="space-y-2">
                <label className="block text-white font-medium">Full Name *</label>
                <input type="text" className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white" disabled placeholder="Player's full name" />
              </div>
              <div className="space-y-2">
                <label className="block text-white font-medium">Email *</label>
                <input type="email" className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white" disabled placeholder="Player's email" />
              </div>

              {/* Custom fields */}
              {formData.customFields.map((field) => (
                <div key={field.id} className="space-y-2">
                  <label className="block text-white font-medium">
                    {field.label} {field.required && '*'}
                  </label>
                  {field.type === 'text' && (
                    <input type="text" className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white" disabled placeholder={field.placeholder} />
                  )}
                  {field.type === 'textarea' && (
                    <textarea className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white" disabled placeholder={field.placeholder} rows={3} />
                  )}
                  {field.type === 'select' && (
                    <select className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white" disabled>
                      <option value="">Select an option</option>
                      {field.options?.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  )}
                  {field.type === 'checkbox' && (
                    <label className="flex items-center gap-2">
                      <input type="checkbox" className="w-4 h-4" disabled />
                      <span className="text-white/70">Yes, I agree to this</span>
                    </label>
                  )}
                  {field.type === 'date' && (
                    <input type="date" className="w-full bg-white/10 border border-white/10 rounded-lg px-4 py-2 text-white" disabled />
                  )}
                </div>
              ))}

              {/* Waiver (if enabled) */}
              {formData.requireWaiver && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <div className="text-white/70 text-sm mb-2">Waiver & Release:</div>
                  <div className="bg-white/5 rounded-lg p-3 text-white/60 text-sm max-h-32 overflow-y-auto">
                    {formData.waiverText || 'No waiver text configured'}
                  </div>
                  <label className="flex items-center gap-2 mt-3 cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded" checked disabled />
                    <span className="text-white/70 text-sm">I agree to the waiver and release terms</span>
                  </label>
                </div>
              )}

              {/* Pricing summary */}
              <div className="mt-6 pt-4 border-t border-white/10">
                <div className="text-white/70 text-sm">Registration Fee:</div>
                <div className="text-2xl font-bold text-cyan-400">${formData.baseFee.toFixed(2)}</div>
                {formData.earlyBirdFee && (
                  <div className="text-green-400 text-sm">Early Bird: ${formData.earlyBirdFee.toFixed(2)}</div>
                )}
                {formData.lateFee && (
                  <div className="text-red-400 text-sm">Late Fee: ${formData.lateFee.toFixed(2)}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
