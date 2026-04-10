# NPC: Victoria
# Zone: Tutorial
# Author: Specialty of Clumsy's World
# Contributors: 
# Description: Creates Spells
# Variables: None

#:: Components ::#
#:: Scribestones ::#
# 150108 : Minor Scribestone   : 51-52 : 26pp
# 150109 : Lesser Scribestone  : 53-54 : 44pp
# 150110 : Scribestone 		   : 55-56 : 65pp
# 150111 : Greater Scribestone : 57-58 : 91pp
# 150112 : Major Scribestone   : 59-60 : 120pp
#:: Energy Focii ::#
# 150113 : Depleted Energy Focus I    : 31pp
# 150114 : Depleted Energy Focus II   : 31pp
# 150115 : Depleted Energy Focus III  : 31pp
# 150116 : Depleted Energy Focus IV   : 31pp
# 150117 : Depleted Energy Focus V    : 31pp
# 150118 : Depleted Energy Focus VI   : 52pp
# 150119 : Depleted Energy Focus VII  : 79pp
# 150120 : Depleted Energy Focus VIII : 105pp
# 150121 : Depleted Energy Focus IX   : 183pp
# 150122 : Depleted Energy Focus X    : 244pp
#:: Other ::#
# 150123 : Power Amplifier  : 249pp
# 150248 : Power Stabilizer : 50pp
#:: Dropped ::#
# 150600 : Ancient Text (Velious Raid Mobs)
#:: Whisper Color ::#
$whisper = 315;  # Tan
#:: Turnin & Rewards ::#
# Item 1 = Scribestone
# Item 2 = Focii
# Item 3 = Stabilizer (Single Target) or Amplifier (Better Group Spells - For bards this is overhaste/damage increase spells like Rizlonas)
# Item 4 = Spell Req
# Class = classid
# Level Range - Done in 2 level increments to save space. 65 and 70 are done alone.

%combines = (
	  1 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 15702, "class" => "Bard", "level" => 5152, "reward" => 7706 }, # Battlecry of the Vah Shir
	  2 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15745, "class" => "Bard", "level" => 5152, "reward" => 59001 }, # Aria of Innocence
	  3 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 19498, "class" => "Beastlord", "level" => 5152, "reward" => 19499 }, # Spiritual Radiance
	  4 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 7720, "class" => "Beastlord", "level" => 5152, "reward" => 7722 }, # Aid of Khurenz
	  5 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 7719, "class" => "Beastlord", "level" => 5152, "reward" => 59010 }, # Bond of the Wild
	  6 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 15097, "class" => "Cleric", "level" => 5152, "reward" => 59012 }, # Pure Blood
	  7 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 30443, "class" => "Cleric", "level" => 5152, "reward" => 7606 }, # Epitaph of Life
	  8 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 26963, "class" => "Cleric", "level" => 5152, "reward" => 150548 }, # Aura of Faith
	  9 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 15034, "class" => "Druid", "level" => 5152, "reward" => 7616 }, # Foliage Shield
	 10 => { "item1" => 150108, "item2" => 150114, "item3" => 150123, "item4" => 15098, "class" => "Druid", "level" => 5152, "reward" => 59012 }, # Pure Blood
	 11 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15427, "class" => "Druid", "level" => 5152, "reward" => 59599 }, # Feral Pack
	 12 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 7665, "class" => "Enchanter", "level" => 5152, "reward" => 7666 }, # Trickster's Augmentation
	 13 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 30407, "class" => "Enchanter", "level" => 5152, "reward" => 59016 }, # Scryer's Trespass
	 14 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15184, "class" => "Enchanter", "level" => 5152, "reward" => 59645 }, # Ordinance
	 15 => { "item1" => 150108, "item2" => 150114, "item3" => 150248, "item4" => 15107, "class" => "Magician", "level" => 5152, "reward" => 59018 }, # Elemental Empathy
	 16 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 26971, "class" => "Magician", "level" => 5152, "reward" => 7636 }, # Transon's Elemental Infusion
	 17 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 7645, "class" => "Necromancer", "level" => 5152, "reward" => 7646 }, # Degeneration
	 18 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15366, "class" => "Necromancer", "level" => 5152, "reward" => 59005 }, # Comatose
	 19 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15009, "class" => "Paladin", "level" => 5152, "reward" => 59004 }, # Light of Life
	 20 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 15693, "class" => "Paladin", "level" => 5152, "reward" => 150474 }, # Overwhelming Purpose
	 21 => { "item1" => 150108, "item2" => 150118, "item3" => 150248, "item4" => 59582, "class" => "Paladin", "level" => 5152, "reward" => 77856 }, # Tome of Guard of Piety
	 22 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 7692, "class" => "Ranger", "level" => 5152, "reward" => 7696 }, # Falcon Eye
	 23 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 26951, "class" => "Ranger", "level" => 5152, "reward" => 59008 }, # Icewind
	 24 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 66390, "class" => "Rogue", "level" => 5152, "reward" => 66391 }, # Thief's Vengeance
	 25 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15343, "class" => "Shadowknight", "level" => 5152, "reward" => 7675 }, # Abduction of Strength
	 26 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 7674, "class" => "Shadowknight", "level" => 5152, "reward" => 7676 }, # Mental Corruption
	 27 => { "item1" => 150108, "item2" => 150115, "item3" => 150248, "item4" => 15366, "class" => "Shadowknight", "level" => 5152, "reward" => 59005 }, # Comatose
	 28 => { "item1" => 150108, "item2" => 150118, "item3" => 150248, "item4" => 30459, "class" => "Shadowknight", "level" => 5152, "reward" => 77857 }, # Tome of Ichor Guard
	 29 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15098, "class" => "Shaman", "level" => 5152, "reward" => 7626 }, # Disinfecting Aura
	 30 => { "item1" => 150108, "item2" => 150122, "item3" => 150248, "item4" => 28544, "class" => "Shaman", "level" => 5152, "reward" => 19520 }, # Primal Essence
	 31 => { "item1" => 150108, "item2" => 150113, "item3" => 150123, "item4" => 7626, "class" => "Shaman", "level" => 5152, "reward" => 59525 }, # Blood of Nadox
	 32 => { "item1" => 150108, "item2" => 150113, "item3" => 150248, "item4" => 15658, "class" => "Wizard", "level" => 5152, "reward" => 59021 }, # Frozen Harpoon
	 33 => { "item1" => 150109, "item2" => 150113, "item3" => 150123, "item4" => 59603, "class" => "Bard", "level" => 5354, "reward" => 59604 }, # Rizlona's Fire
	 34 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 7721, "class" => "Beastlord", "level" => 5354, "reward" => 7723 }, # Spirit of Omakin
	 35 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 7736, "class" => "Beastlord", "level" => 5354, "reward" => 19531 }, # Spirit of Snow
	 36 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 26956, "class" => "Beastlord", "level" => 5354, "reward" => 26957 }, # Iceshard
	 37 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 59884, "class" => "Berserker", "level" => 5354, "reward" => 59885 }, # Tome of Leg Slice
	 38 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 150457, "class" => "Berserker", "level" => 5354, "reward" => 150456 }, # Tome of War Volley
	 39 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15672, "class" => "Cleric", "level" => 5354, "reward" => 7607 }, # Mark of Retribution
	 40 => { "item1" => 150109, "item2" => 150117, "item3" => 150248, "item4" => 19542, "class" => "Cleric", "level" => 5354, "reward" => 19522 }, # Remove Greater Curse
	 41 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 59576, "class" => "Cleric", "level" => 5354, "reward" => 59577 }, # Protection of Vie
	 42 => { "item1" => 150109, "item2" => 150122, "item3" => 150123, "item4" => 150485, "class" => "Cleric", "level" => 5354, "reward" => 150486 }, # Strike of Marzin
	 43 => { "item1" => 150109, "item2" => 150116, "item3" => 150248, "item4" => 19542, "class" => "Druid", "level" => 5354, "reward" => 19522 }, # Remove Greater Curse
	 44 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 19238, "class" => "Druid", "level" => 5354, "reward" => 7617 }, # Spirit of Eagle
	 45 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15647, "class" => "Enchanter", "level" => 5354, "reward" => 7667 }, # Beguiling Visage
	 46 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15592, "class" => "Enchanter", "level" => 5354, "reward" => 77918 }, # Illusion Orc
	 47 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 19352, "class" => "Magician", "level" => 5354, "reward" => 19521 }, # Phantasmal Armor
	 48 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15042, "class" => "Magician", "level" => 5354, "reward" => 7637 }, # Veil of Elements
	 49 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15109, "class" => "Magician", "level" => 5354, "reward" => 26969 }, # Elemental Cloak
	 50 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 150118, "class" => "Magician", "level" => 5354, "reward" => 59939 }, # Elemental Draw
	 51 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 150119, "class" => "Magician", "level" => 5354, "reward" => 59559 }, # Kindle
	 52 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 7645, "class" => "Necromancer", "level" => 5354, "reward" => 7647 }, # Succussion of Shadows
	 53 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 26958, "class" => "Necromancer", "level" => 5354, "reward" => 26959 }, # Torbas' Venom Blast
	 54 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 59619, "class" => "Necromancer", "level" => 5354, "reward" => 59620 }, # Imprecation
	 55 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15124, "class" => "Paladin", "level" => 5354, "reward" => 59527 }, # Force of Akera
	 56 => { "item1" => 150109, "item2" => 150114, "item3" => 150248, "item4" => 15124, "class" => "Paladin", "level" => 5354, "reward" => 7687 }, # Words of Tranquility
	 57 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 7684, "class" => "Paladin", "level" => 5354, "reward" => 19505 }, # Divine Glory
	 58 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 19433, "class" => "Ranger", "level" => 5354, "reward" => 7697 }, # Jolting Blades
	 59 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 24540, "class" => "Shadowknight", "level" => 5354, "reward" => 24541 }, # Terror of Death
	 60 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 30457, "class" => "Shadowknight", "level" => 5354, "reward" => 7677 }, # Torrent of Hate
	 61 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 26949, "class" => "Shadowknight", "level" => 5354, "reward" => 26950 }, # Spear of Plague
	 62 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 59590, "class" => "Shadowknight", "level" => 5354, "reward" => 59591 }, # Call of Darkness
	 63 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 59593, "class" => "Shadowknight", "level" => 5354, "reward" => 59594 }, # Scythe of Death
	 64 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15527, "class" => "Shaman", "level" => 5354, "reward" => 7627 }, # Plague of Insects
	 65 => { "item1" => 150109, "item2" => 150114, "item3" => 150248, "item4" => 19542, "class" => "Shaman", "level" => 5354, "reward" => 19522 }, # Remove Greater Curse
	 66 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 59613, "class" => "Shaman", "level" => 5354, "reward" => 59614 }, # Anathema
	 67 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 26960, "class" => "Shaman", "level" => 5354, "reward" => 26961 }, # Blast of Venom
	 68 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 7655, "class" => "Wizard", "level" => 5354, "reward" => 7657 }, # Familiar
	 69 => { "item1" => 150109, "item2" => 150115, "item3" => 150248, "item4" => 15108, "class" => "Wizard", "level" => 5354, "reward" => 26969 }, # Elemental Cloak
	 70 => { "item1" => 150109, "item2" => 150113, "item3" => 150248, "item4" => 15067, "class" => "Wizard", "level" => 5354, "reward" => 59628 }, # Magi Ward
	 71 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 30450, "class" => "Bard", "level" => 5556, "reward" => 30451 }, # Occlusion of Sound
	 72 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 59002, "class" => "Bard", "level" => 5556, "reward" => 7708 }, # Purifying Chorus
	 73 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 59010, "class" => "Beastlord", "level" => 5556, "reward" => 7725 }, # Omakin's Alacrity
	 74 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 7722, "class" => "Beastlord", "level" => 5556, "reward" => 7724 }, # Sha's Restoration
	 75 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 7737, "class" => "Beastlord", "level" => 5556, "reward" => 19530 }, # Spirit of Flame
	 76 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 7723, "class" => "Beastlord", "level" => 5556, "reward" => 7726 }, # Spirit of Zehkes
	 77 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15675, "class" => "Cleric", "level" => 5556, "reward" => 7117 }, # Hammer of Judgment
	 78 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 19212, "class" => "Cleric", "level" => 5556, "reward" => 7608 }, # Judgment
	 79 => { "item1" => 150110, "item2" => 150114, "item3" => 150248, "item4" => 19209, "class" => "Cleric", "level" => 5556, "reward" => 7118 }, # Yaulp V
	 80 => { "item1" => 150110, "item2" => 150114, "item3" => 150248, "item4" => 19202, "class" => "Cleric", "level" => 5556, "reward" => 77841 }, # Cower the Dead
	 81 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15140, "class" => "Druid", "level" => 5556, "reward" => 30475 }, # Nature Walker's Behest
	 82 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15009, "class" => "Druid", "level" => 5556, "reward" => 19507 }, # Chloroblast
	 83 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 59600, "class" => "Druid", "level" => 5556, "reward" => 59601 }, # Vengeance of Nature
	 84 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 19237, "class" => "Druid", "level" => 5556, "reward" => 7618 }, # Ro's Smoldering Disjunction
	 85 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 30408, "class" => "Enchanter", "level" => 5556, "reward" => 30409 }, # Gift of Insight
	 86 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 59642, "class" => "Enchanter", "level" => 5556, "reward" => 59643 }, # Protection of Alendar
	 87 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15596, "class" => "Enchanter", "level" => 5556, "reward" => 90047 }, # Illusion Frost Bone
	 88 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 59015, "class" => "Enchanter", "level" => 5556, "reward" => 7668 }, # Horrifying Visage
	 89 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15107, "class" => "Magician", "level" => 5556, "reward" => 30472 }, # Burnout IV
	 90 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 30403, "class" => "Magician", "level" => 5556, "reward" => 30405 }, # Wrath of the Elements
	 91 => { "item1" => 150110, "item2" => 150113, "item3" => 150123, "item4" => 29364, "class" => "Magician", "level" => 5556, "reward" => 7638 }, # Mass Mystical Transvergence
	 92 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15850, "class" => "Magician", "level" => 5556, "reward" => 29364 }, # Rod of Mystical Transvergence
	 93 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15661, "class" => "Necromancer", "level" => 5556, "reward" => 30414 }, # Augmentation of Death
	 94 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 19302, "class" => "Necromancer", "level" => 5556, "reward" => 19480 }, # Conglaciation of Bone
	 95 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 7646, "class" => "Necromancer", "level" => 5556, "reward" => 7648 }, # Crippling Claudication
	 96 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 19202, "class" => "Necromancer", "level" => 5556, "reward" => 77878 }, # Eidolon Voice
	 97 => { "item1" => 150110, "item2" => 150113, "item3" => 150123, "item4" => 26964, "class" => "Paladin", "level" => 5556, "reward" => 30455 }, # Wave of Healing
	 98 => { "item1" => 150110, "item2" => 150120, "item3" => 150248, "item4" => 15312, "class" => "Paladin", "level" => 5556, "reward" => 59582 }, # Austerity
	 99 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 30453, "class" => "Paladin", "level" => 5556, "reward" => 7688 }, # Breath of Tunare
	100 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 150480, "class" => "Paladin", "level" => 5556, "reward" => 150481 }, # Bemusing Light
	101 => { "item1" => 150110, "item2" => 150120, "item3" => 150248, "item4" => 77856, "class" => "Paladin", "level" => 5556, "reward" => 4645 }, # Tome of Holy Aura
	102 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 30461, "class" => "Ranger", "level" => 5556, "reward" => 30463 }, # Call of Fire
	103 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15259, "class" => "Ranger", "level" => 5556, "reward" => 59589 }, # Fire Swarm
	104 => { "item1" => 150110, "item2" => 150113, "item3" => 150123, "item4" => 7694, "class" => "Ranger", "level" => 5556, "reward" => 7698 }, # Mark of the Predator
	105 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 19490, "class" => "Shadowknight", "level" => 5556, "reward" => 30459 }, # Shroud of Death
	106 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 24544, "class" => "Shadowknight", "level" => 5556, "reward" => 24545 }, # Voice of Death
	107 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 30458, "class" => "Shadowknight", "level" => 5556, "reward" => 7678 }, # Torrent of Pain
	108 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 15059, "class" => "Shadowknight", "level" => 5556, "reward" => 77847 }, # Soulless Fear
	109 => { "item1" => 150110, "item2" => 150120, "item3" => 150248, "item4" => 77857, "class" => "Shadowknight", "level" => 5556, "reward" => 4078 }, # Tome of Cursed Shield
	110 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 7623, "class" => "Shaman", "level" => 5556, "reward" => 30431 }, # Form of the Great Bear
	111 => { "item1" => 150110, "item2" => 150115, "item3" => 150248, "item4" => 15009, "class" => "Shaman", "level" => 5556, "reward" => 19507 }, # Chloroblast
	112 => { "item1" => 150110, "item2" => 150120, "item3" => 150123, "item4" => 19243, "class" => "Shaman", "level" => 5556, "reward" => 7628 }, # Regrowth of Dar Khura
	113 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 66461, "class" => "Warrior", "level" => 5556, "reward" => 66462 }, # Tome of Berate
	114 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 150477, "class" => "Warrior", "level" => 5556, "reward" => 150478 }, # Berating Shout
	115 => { "item1" => 150110, "item2" => 150113, "item3" => 150248, "item4" => 30422, "class" => "Wizard", "level" => 5556, "reward" => 7658 }, # Decession	
	116 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19459, "class" => "Bard", "level" => 5758, "reward" => 7709 }, # Chorus of Replenishment
	117 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19453, "class" => "Bard", "level" => 5758, "reward" => 24548 }, # Dreams of Ayonae
	118 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 7726, "class" => "Beastlord", "level" => 5758, "reward" => 7727 },  # Spirit of Khurenz
	119 => { "item1" => 150111, "item2" => 150117, "item3" => 150248, "item4" => 150218, "class" => "Beastlord", "level" => 5758, "reward" => 59651 }, # Guard of Calliav
	120 => { "item1" => 150111, "item2" => 150120, "item3" => 150123, "item4" => 59914, "class" => "Berserker", "level" => 5758, "reward" => 59916 }, # Tome of Battle Cry of Dravel
	121 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 7605, "class" => "Cleric", "level" => 5758, "reward" => 7609 }, # Blessed Armor of the Risen
	122 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19208, "class" => "Cleric", "level" => 5758, "reward" => 7119 }, # Ethereal Light
	123 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 7117, "class" => "Cleric", "level" => 5758, "reward" => 15997 }, # Hammer of Divinity
	124 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 77864, "class" => "Cleric", "level" => 5758, "reward" => 77865 }, # Ward of Rebuke
	125 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19231, "class" => "Druid", "level" => 5758, "reward" => 77850 }, # Instinctual Fear
	126 => { "item1" => 150111, "item2" => 19232, "item3" => 150123, "item4" => 19234, "class" => "Druid", "level" => 5758, "reward" => 7619 }, # Circle of Seasons
	127 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19507, "class" => "Druid", "level" => 5758, "reward" => 2482 }, # Tunare's Renewal
	128 => { "item1" => 150111, "item2" => 150117, "item3" => 150248, "item4" => 19220, "class" => "Enchanter", "level" => 5758, "reward" => 77835 }, # Phobia
	129 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19384, "class" => "Enchanter", "level" => 5758, "reward" => 19481 }, # Dementing Visions
	130 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 7667, "class" => "Enchanter", "level" => 5758, "reward" => 7669 }, # Glamorous Visage
	131 => { "item1" => 150111, "item2" => 150117, "item3" => 150248, "item4" => 150221, "class" => "Enchanter", "level" => 5758, "reward" => 59647 }, # Reflect
	132 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19521, "class" => "Magician", "level" => 5758, "reward" => 7639 }, # Transon's Phantasmal Protection
	133 => { "item1" => 150111, "item2" => 150116, "item3" => 150248, "item4" => 150218, "class" => "Magician", "level" => 5758, "reward" => 59634 }, # Guard of Calliav
	134 => { "item1" => 150111, "item2" => 150116, "item3" => 150248, "item4" => 150221, "class" => "Magician", "level" => 5758, "reward" => 59638 }, # Reflect
	135 => { "item1" => 150111, "item2" => 150120, "item3" => 150248, "item4" => 66321, "class" => "Monk", "level" => 5758, "reward" => 66322 }, # Phantom Echo
	136 => { "item1" => 150111, "item2" => 150113, "item3" => 150123, "item4" => 19410, "class" => "Necromancer", "level" => 5758, "reward" => 7649 }, # Mind Wrack
	137 => { "item1" => 150111, "item2" => 150116, "item3" => 150248, "item4" => 19220, "class" => "Necromancer", "level" => 5758, "reward" => 77832 }, # Unholy Voice
	138 => { "item1" => 150111, "item2" => 150115, "item3" => 150248, "item4" => 150218, "class" => "Necromancer", "level" => 5758, "reward" => 59617 }, # Guard of Calliav
	139 => { "item1" => 150111, "item2" => 150115, "item3" => 150248, "item4" => 150221, "class" => "Necromancer", "level" => 5758, "reward" => 59623 }, # Reflect
	140 => { "item1" => 150111, "item2" => 150113, "item3" => 150123, "item4" => 30455, "class" => "Paladin", "level" => 5758, "reward" => 7689 }, # Healing Wave of Prexus
	141 => { "item1" => 150111, "item2" => 150113, "item3" => 150123, "item4" => 59582, "class" => "Paladin", "level" => 5758, "reward" => 59583 }, # Blessing of Austerity
	142 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 7696, "class" => "Ranger", "level" => 5758, "reward" => 7699 }, # Eagle Eye
	143 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 30463, "class" => "Ranger", "level" => 5758, "reward" => 59587 }, # Call of Ice
	144 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 15127, "class" => "Shadowknight", "level" => 5758, "reward" => 77838 }, # Shadow Voice
	145 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 59590, "class" => "Shadowknight", "level" => 5758, "reward" => 19532 }, # Deathly Temptation
	146 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 7675, "class" => "Shadowknight", "level" => 5758, "reward" => 7679 }, # Torrent of Fatigue
	147 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 77866, "class" => "Shaman", "level" => 5758, "reward" => 77867 }, # Spirit of the Jaguar
	148 => { "item1" => 150111, "item2" => 150113, "item3" => 150123, "item4" => 19278, "class" => "Shaman", "level" => 5758, "reward" => 19528 }, # Acumen of Dar Khura
	149 => { "item1" => 150111, "item2" => 150114, "item3" => 150248, "item4" => 19507, "class" => "Shaman", "level" => 5758, "reward" => 2483 }, # Kragg's Mending
	150 => { "item1" => 150111, "item2" => 19264, "item3" => 150123, "item4" => 19267, "class" => "Shaman", "level" => 5758, "reward" => 7629 }, # Talisman of Epuration
	151 => { "item1" => 150111, "item2" => 150120, "item3" => 150248, "item4" => 19272, "class" => "Shaman", "level" => 5758, "reward" => 19473 }, # Cannibalize IV
	152 => { "item1" => 150111, "item2" => 150114, "item3" => 150248, "item4" => 59625, "class" => "Wizard", "level" => 5758, "reward" => 59626 }, # Guard of Calrena
	153 => { "item1" => 150111, "item2" => 150113, "item3" => 150248, "item4" => 19414, "class" => "Wizard", "level" => 5758, "reward" => 7659 }, # Spellshield
	154 => { "item1" => 150111, "item2" => 150114, "item3" => 150248, "item4" => 150221, "class" => "Wizard", "level" => 5758, "reward" => 59631 }, # Reflect
	155 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 30449, "class" => "Bard", "level" => 5960, "reward" => 30452 }, # Composition of Ervaj
	156 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 15736, "class" => "Bard", "level" => 5960, "reward" => 30479 }, # Ervaj's Lost Composition
	157 => { "item1" => 150112, "item2" => 150122, "item3" => 150123, "item4" => 7706, "class" => "Bard", "level" => 5960, "reward" => 7710 }, # Warsong of the Vah Shir
	158 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 15707, "class" => "Bard", "level" => 5960, "reward" => 59653 }, # Fufil's Diminishing Dirge
	159 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 7709, "class" => "Bard", "level" => 5960, "reward" => 26622 }, # Ancient: Lcea's Lament
	160 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 24548, "class" => "Bard", "level" => 5960, "reward" => 26623 }, # Ancient: Lullaby of Shadows
	161 => { "item1" => 150112, "item2" => 150113, "item3" => 150123, "item4" => 19499, "class" => "Beastlord", "level" => 5960, "reward" => 7729 }, # Spiritual Purity
	162 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 7727, "class" => "Beastlord", "level" => 5960, "reward" => 7731 }, # Spirit of Khati Sha
	163 => { "item1" => 150112, "item2" => 150122, "item3" => 150248, "item4" => 59010, "class" => "Beastlord", "level" => 5960, "reward" => 19537 }, # Savagery
	164 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 7734, "class" => "Beastlord", "level" => 5960, "reward" => 19538 }, # Sha's Advantage
	165 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19200, "class" => "Beastlord", "level" => 5960, "reward" => 7730 }, # Spiritual Strength
	166 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 7725, "class" => "Beastlord", "level" => 5960, "reward" => 7728 }, # Sha's Ferocity
	167 => { "item1" => 150112, "item2" => 150114, "item3" => 150248, "item4" => 59887, "class" => "Berserker", "level" => 5960, "reward" => 59888 }, # Tome of Headcrush
	168 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19201, "class" => "Cleric", "level" => 5960, "reward" => 7121 }, # Ethereal Remedy
	169 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19220, "class" => "Cleric", "level" => 5960, "reward" => 77829}, # Deistic Voice
	170 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19216, "class" => "Cleric", "level" => 5960, "reward" => 30447 }, # Aegolism
	171 => { "item1" => 150112, "item2" => 150122, "item3" => 150123, "item4" => 30447, "class" => "Cleric", "level" => 5960, "reward" => 7610 }, # Blessing of Aegolism
	172 => { "item1" => 150112, "item2" => 150113, "item3" => 150123, "item4" => 19226, "class" => "Cleric", "level" => 5960, "reward" => 7120 }, # Ethereal Elixir
	173 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 15997, "class" => "Cleric", "level" => 5960, "reward" => 15995 }, # Hammer of Souls
	174 => { "item1" => 150112, "item2" => 150113, "item3" => 150123, "item4" => 19435, "class" => "Cleric", "level" => 5960, "reward" => 19533 }, # Marzin's Mark
	175 => { "item1" => 150112, "item2" => 150120, "item3" => 150123, "item4" => 66201, "class" => "Cleric", "level" => 5960, "reward" => 2854 }, # Divine Confidence
	176 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 7610, "class" => "Cleric", "level" => 5960, "reward" => 26621 }, # Ancient: Gift of Aegolism
	177 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 7609, "class" => "Cleric", "level" => 5960, "reward" => 26608 }, # Ancient: High Priest's Bulwark
	178 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19251, "class" => "Druid", "level" => 5960, "reward" => 9722 }, # Protection of the Cabbage
	179 => { "item1" => 150112, "item2" => 150122, "item3" => 150248, "item4" => 15392, "class" => "Druid", "level" => 5960, "reward" => 66281 }, # Incarnate Anew
	180 => { "item1" => 150112, "item2" => 150113, "item3" => 150123, "item4" => 9722, "class" => "Druid", "level" => 5960, "reward" => 30442 }, # Protection of the Glades
	181 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19261, "class" => "Druid", "level" => 5960, "reward" => 19529 }, # Mask of the Stalker
	182 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19252, "class" => "Druid", "level" => 5960, "reward" => 19519 }, # Moonfire
	183 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19243, "class" => "Druid", "level" => 5960, "reward" => 7620 }, # Nature's Recovery
	184 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 2482, "class" => "Druid", "level" => 5960, "reward" => 19508 }, # Nature's Touch
	185 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 19259, "class" => "Druid", "level" => 5960, "reward" => 26609 }, # Ancient: Legacy of Blades
	186 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 19257, "class" => "Druid", "level" => 5960, "reward" => 26610 }, # Ancient: Starfire of Ro
	187 => { "item1" => 150112, "item2" => 150122, "item3" => 150123, "item4" => 19401, "class" => "Enchanter", "level" => 5960, "reward" => 7670 }, # Koadic's Endless Intellect
	188 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 30409, "class" => "Enchanter", "level" => 5960, "reward" => 30410 }, # Gift of Brilliance
	189 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19416, "class" => "Enchanter", "level" => 5960, "reward" => 19535 }, # Speed of the Brood
	190 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 19481, "class" => "Enchanter", "level" => 5960, "reward" => 26620 }, # Ancient: Chaotic Visions
	191 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 19403, "class" => "Enchanter", "level" => 5960, "reward" => 26619 }, # Ancient: Eternal Rapture
	192 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 30402, "class" => "Magician", "level" => 5960, "reward" => 30404 }, # Monster Summoning III
	193 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19359, "class" => "Magician", "level" => 5960, "reward" => 19497 }, # Maelstrom of Electricity
	194 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19358, "class" => "Magician", "level" => 5960, "reward" => 7640 }, # Shock of Fiery Blades
	195 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 7636, "class" => "Magician", "level" => 5960, "reward" => 19536 }, # Transon's Elemental Renewal
	196 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19346, "class" => "Magician", "level" => 5960, "reward" => 59632 }, # Wind of the Desert
	197 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 30472, "class" => "Magician", "level" => 5960, "reward" => 26618 }, # Ancient: Burnout Blaze
	198 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 7640, "class" => "Magician", "level" => 5960, "reward" => 26617 }, # Ancient: Shock of Sun
	199 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19314, "class" => "Necromancer", "level" => 5960, "reward" => 30416 }, # Arch Lich
	200 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 59005, "class" => "Necromancer", "level" => 5960, "reward" => 30460 }, # Death Peace
	201 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19308, "class" => "Necromancer", "level" => 5960, "reward" => 19527 }, # Funeral Pyre of Kelador
	202 => { "item1" => 150112, "item2" => 150113, "item3" => 150123, "item4" => 59019, "class" => "Necromancer", "level" => 5960, "reward" => 7650 }, # Zevfeer's Theft of Vitae
	203 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 26959, "class" => "Necromancer", "level" => 5960, "reward" => 26614 }, # Ancient: Lifebane
	204 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 30416, "class" => "Necromancer", "level" => 5960, "reward" => 26613 }, # Ancient: Master of Death
	205 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19505, "class" => "Paladin", "level" => 5960, "reward" => 30456 }, # Divine Strength
	206 => { "item1" => 150112, "item2" => 150113, "item3" => 150123, "item4" => 26965, "class" => "Paladin", "level" => 5960, "reward" => 7690 }, # Brell's Mountainous Barrier
	207 => { "item1" => 150112, "item2" => 150115, "item3" => 150248, "item4" => 19542, "class" => "Paladin", "level" => 5960, "reward" => 19522 }, # Remove Greater Curse
	208 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 15488, "class" => "Paladin", "level" => 5960, "reward" => 66434 }, # Tome of Deflection
	209 => { "item1" => 150112, "item2" => 150122, "item3" => 150248, "item4" => 66230, "class" => "Paladin", "level" => 5960, "reward" => 4644 }, # Tome of Blessed Stance
	210 => { "item1" => 150112, "item2" => 150113, "item3" => 150123, "item4" => 7698, "class" => "Ranger", "level" => 5960, "reward" => 30464 }, # Call of the Predator
	211 => { "item1" => 150112, "item2" => 150121, "item3" => 150248, "item4" => 15518, "class" => "Ranger", "level" => 5960, "reward" => 7700 }, # Warder's Protection
	212 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 24541, "class" => "Shadowknight", "level" => 5960, "reward" => 24542 }, # Terror of Terris
	213 => { "item1" => 150112, "item2" => 150115, "item3" => 150248, "item4" => 59005, "class" => "Shadowknight", "level" => 5960, "reward" => 30460 }, # Death Peace
	214 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 19431, "class" => "Shadowknight", "level" => 5960, "reward" => 7680 }, # Cloak of the Akheva
	215 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 24545, "class" => "Shadowknight", "level" => 5960, "reward" => 24546 }, # Voice of Terris
	216 => { "item1" => 150112, "item2" => 150114, "item3" => 150248, "item4" => 15394, "class" => "Shadowknight", "level" => 5960, "reward" => 66434 }, # Tome of Deflection
	217 => { "item1" => 150112, "item2" => 150122, "item3" => 150248, "item4" => 66250, "class" => "Shadowknight", "level" => 5960, "reward" => 4079 }, # Tome of Vampiric Stance
	218 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 7625, "class" => "Shaman", "level" => 5960, "reward" => 30432 }, # Focus of Spirit
	219 => { "item1" => 150112, "item2" => 150122, "item3" => 150248, "item4" => 19292, "class" => "Shaman", "level" => 5960, "reward" => 19491 }, # Primal Avatar
	220 => { "item1" => 150112, "item2" => 150122, "item3" => 150123, "item4" => 30432, "class" => "Shaman", "level" => 5960, "reward" => 7630 }, # Khura's Focusing
	221 => { "item1" => 150112, "item2" => 150121, "item3" => 150248, "item4" => 15392, "class" => "Shaman", "level" => 5960, "reward" => 66281 }, # Incarnate Anew
	222 => { "item1" => 150112, "item2" => 150121, "item3" => 150123, "item4" => 150472, "class" => "Shaman", "level" => 5960, "reward" => 26911 }, # Talisman of Celerity
	223 => { "item1" => 150112, "item2" => 150122, "item3" => 150123, "item4" => 19520, "class" => "Shaman", "level" => 5960, "reward" => 150473 }, # Group Primal Essence
	224 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 19491, "class" => "Shaman", "level" => 5960, "reward" => 26611 }, # Ancient: Feral Avatar
	225 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 19277, "class" => "Shaman", "level" => 5960, "reward" => 26612 }, # Ancient: Scourge of Nife
	226 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 59021, "class" => "Wizard", "level" => 5960, "reward" => 30426 }, # Ice Spear of Solist
	227 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 15755, "class" => "Wizard", "level" => 5960, "reward" => 19525 }, # Elnerick's Electrical Rending
	228 => { "item1" => 150112, "item2" => 150121, "item3" => 150248, "item4" => 19345, "class" => "Wizard", "level" => 5960, "reward" => 19526 }, # Garrison's Superior Sundering
	229 => { "item1" => 150112, "item2" => 150113, "item3" => 150248, "item4" => 7657, "class" => "Wizard", "level" => 5960, "reward" => 7660 }, # Greater Familiar
	230 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 30426, "class" => "Wizard", "level" => 5960, "reward" => 26615 }, # Ancient: Destruction of Ice
	231 => { "item1" => 150112, "item2" => 150122, "item3" => 150600, "item4" => 15752, "class" => "Wizard", "level" => 5960, "reward" => 26616 }, # Ancient: Greater Concussion
	232 => { "item1" => 150110, "item2" => 150118, "item3" => 150123, "item4" => 15125, "class" => "Cleric", "level" => 5556, "reward" => 30446 }, # Stun Command
	233 => { "item1" => 150112, "item2" => 150120, "item3" => 150248, "item4" => 66335, "class" => "Rogue", "level" => 5960, "reward" => 151003 }, # Tome of Pernicious Stance
	234 => { "item1" => 150109, "item2" => 150120, "item3" => 150123, "item4" => 77866, "class" => "Shaman", "level" => 5354, "reward" => 151004 }, # Talisman of the Puma
	235 => { "item1" => 150112, "item2" => 150122, "item3" => 150123, "item4" => 77867, "class" => "Shaman", "level" => 5960, "reward" => 151005 }, # Talisman of the Jaguar
);

sub EVENT_SAY {

   my $one = quest::saylink("51 52");
   my $two = quest::saylink("53 54");
   my $three = quest::saylink("55 56");
   my $four = quest::saylink("57 58");
   my $five = quest::saylink("59 60");
   #my $six = quest::saylink("61 62");
   #my $seven = quest::saylink("63 64");
   #my $eight = quest::saylink("65");
   #my $nine = quest::saylink("66 67");
   #my $ten = quest::saylink("68 69");
   #my $eleven = quest::saylink("70");

	#:: Intro
	if ($text =~/hail/i) {  
		$client->Message($whisper, "Good day to you, $name. I can create new spells for you. Please choose a level range: [$one], [$two], [$three], [$four], or [$five]."); 
	}
	#:: 51 to 52
	elsif ($text =~/^51 52$/i) {
		$client->Message($whisper, "....::::::::: | 51 - 52 | Spells & Tomes | :::::::::....");
		my $level = 5152;
		foreach (sort keys %combines) {
			if (($combines{$_}->{class} eq $class) && ($combines{$_}->{level} == $level)) {
				my $item1_link = quest::varlink($combines{$_}->{item1});
				my $item2_link = quest::varlink($combines{$_}->{item2});
				my $item3_link = quest::varlink($combines{$_}->{item3});
				my $item4_link = quest::varlink($combines{$_}->{item4});
				my $reward_link = quest::varlink($combines{$_}->{reward});
				$client->Message($whisper, "$item1_link + $item2_link + $item3_link + $item4_link = $reward_link");
			}
		}
 	}
 	#:: 53 to 54
	elsif ($text =~/^53 54$/i) {
		$client->Message($whisper, "....::::::::: | 53 - 54 | Spells & Tomes | :::::::::....");
		my $level = 5354;
	    foreach (sort keys %combines) {
			if (($combines{$_}->{class} eq $class) && ($combines{$_}->{level} == $level)) {
				my $item1_link = quest::varlink($combines{$_}->{item1});
				my $item2_link = quest::varlink($combines{$_}->{item2});
				my $item3_link = quest::varlink($combines{$_}->{item3});
				my $item4_link = quest::varlink($combines{$_}->{item4});
				my $reward_link = quest::varlink($combines{$_}->{reward});
				$client->Message($whisper, "$item1_link + $item2_link + $item3_link + $item4_link = $reward_link");
			}
		}
	}
 	#:: 55 to 56
	elsif ($text =~/^55 56$/i) {
		$client->Message($whisper, "....::::::::: | 55 - 56 | Spells & Tomes | :::::::::....");
		my $level = 5556;
		foreach (sort keys %combines) {
			if (($combines{$_}->{class} eq $class) && ($combines{$_}->{level} == $level)) {
				my $item1_link = quest::varlink($combines{$_}->{item1});
				my $item2_link = quest::varlink($combines{$_}->{item2});
				my $item3_link = quest::varlink($combines{$_}->{item3});
				my $item4_link = quest::varlink($combines{$_}->{item4});
				my $reward_link = quest::varlink($combines{$_}->{reward});
				$client->Message($whisper, "$item1_link + $item2_link + $item3_link + $item4_link = $reward_link");
			}
		}
	}
 	#:: 57 to 58
	elsif ($text =~/^57 58$/i) {
		$client->Message($whisper, "....::::::::: | 57 - 58 | Spells & Tomes | :::::::::....");
		my $level = 5758;
	    foreach (sort keys %combines) {
			if (($combines{$_}->{class} eq $class) && ($combines{$_}->{level} == $level)) {
				my $item1_link = quest::varlink($combines{$_}->{item1});
				my $item2_link = quest::varlink($combines{$_}->{item2});
				my $item3_link = quest::varlink($combines{$_}->{item3});
				my $item4_link = quest::varlink($combines{$_}->{item4});
				my $reward_link = quest::varlink($combines{$_}->{reward});
				$client->Message($whisper, "$item1_link + $item2_link + $item3_link + $item4_link = $reward_link");
			}
		}
	}
 	#:: 59 to 60
	elsif ($text =~/^59 60$/i) {
		$client->Message($whisper, "....::::::::: | 59 - 60 | Spells & Tomes | :::::::::....");
		my $level = 5960;
	    foreach (sort keys %combines) {
			if (($combines{$_}->{class} eq $class) && ($combines{$_}->{level} == $level)) {
				my $item1_link = quest::varlink($combines{$_}->{item1});
				my $item2_link = quest::varlink($combines{$_}->{item2});
				my $item3_link = quest::varlink($combines{$_}->{item3});
				my $item4_link = quest::varlink($combines{$_}->{item4});
				my $reward_link = quest::varlink($combines{$_}->{reward});
				$client->Message($whisper, "$item1_link + $item2_link + $item3_link + $item4_link = $reward_link");
			}
		}
	}
 	#:: Invalid Response
	else {
		$client->Message($whisper, "I cannot create any spells or tomes for you in that level range.");
	}
}   

sub EVENT_ITEM {

	# loop through item => reward array looking for a match
	foreach (sort keys %combines) {
		my $item1 = $combines{$_}->{item1};
		my $item2 = $combines{$_}->{item2};
		my $item3 = $combines{$_}->{item3};
		my $item4 = $combines{$_}->{item4};
		my $reward = $combines{$_}->{reward};

		# hand out the goods on a match of item + cost
		if (plugin::takeItems($item1 => 1, $item2 => 1, $item3 => 1, $item4 => 1)) {
			quest::summonitem($reward);
			quest::ding;
		}
	}

	plugin::returnUnusedItems();
}