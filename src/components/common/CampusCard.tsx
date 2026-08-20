import React from 'react';
import { MapPin, Users, ArrowRight } from 'lucide-react';
import { CampusDetails } from '../../types';

interface CampusCardProps {
  campus: CampusDetails;
  isSelected?: boolean;
  onSelect?: () => void;
  studentCount?: number;
}

export const CampusCard: React.FC<CampusCardProps> = ({
  campus,
  isSelected = false,
  onSelect,
  studentCount
}) => {
  return (
    <div
      onClick={onSelect}
      className={`group relative overflow-hidden rounded-2xl transition-all duration-300 cursor-pointer border ${
        isSelected
          ? 'border-red-900 ring-2 ring-red-900/20 shadow-lg bg-red-50/20'
          : 'border-neutral-200 hover:border-neutral-300 shadow-sm hover:shadow-md bg-white'
      }`}
    >
      <div className="relative h-44 overflow-hidden bg-neutral-100">
        <img
          src={campus.image || "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=600"}
          alt={campus.name}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&q=80&w=600";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-neutral-900 border border-white/50">
          {campus.code}
        </div>
        <div className="absolute bottom-3 left-3 right-3 text-white">
          <div className="flex items-center gap-1.5 text-xs text-neutral-200">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span>{campus.location}</span>
          </div>
        </div>
      </div>

      <div className="p-5">
        <h3 className="text-lg font-bold text-neutral-900 group-hover:text-red-900 transition-colors">
          {campus.name}
        </h3>
        <p className="text-xs text-neutral-500 mt-1 line-clamp-2">
          {campus.description}
        </p>

        <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs text-neutral-600">
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <span className="font-medium text-neutral-900">
              {studentCount !== undefined ? `${studentCount} Verified` : `Est. ${campus.studentCountEstimate}+`}
            </span>
          </div>
          <div className="flex items-center gap-1 text-red-900 font-semibold group-hover:translate-x-0.5 transition-transform">
            <span>Explore</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
