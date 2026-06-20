"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/lib/i18n";
import { LogOut, ShieldCheck } from "lucide-react";

interface RenterHeaderProps {
	fullName: string;
	buildingName: string;
	flatNumber: string;
	floor: number;
	onLogout: () => void;
	isLoggingOut: boolean;
}

export function RenterHeader({
	fullName,
	onLogout,
	isLoggingOut,
}: RenterHeaderProps) {
	const { t } = useTranslation();

	return (
		<Card className="overflow-hidden border border-hairline bg-canvas shadow-sm rounded-xl">
			<div className="bg-brand-blue-deep px-6 py-5 text-white flex  justify-between items-center gap-4">
				<div>
					<h2 className="text-sm md:text-xl font-bold flex items-center gap-2">
						<ShieldCheck className="h-6 w-6 text-brand-orange" aria-hidden />
						{fullName}
					</h2>
				</div>
				<Button
					type="button"
					variant="outline"
					onClick={onLogout}
					disabled={isLoggingOut}
					className="rounded-full cursor-pointer bg-white/10 hover:bg-white/20 text-white border-white/20 min-h-11 gap-2 font-medium"
				>
					<LogOut className="h-4 w-4" aria-hidden />
					{t("common.logout") || "লগ আউট"}
				</Button>
			</div>
		</Card>
	);
}
