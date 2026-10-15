package main

import (
	"fmt"
	"path/filepath"
	"strconv"
)

// srSource 是Reliquary Archiver导出的角色、光锥和遗器结构。
type srSource struct {
	Metadata struct {
		UID int `json:"uid"`
	} `json:"metadata"`
	Characters []struct {
		ID, Name, Path            string
		Level, Ascension, Eidolon int
		Version                   int                                     `json:"ability_version"`
		Skills                    struct{ Basic, Skill, Ult, Talent int } `json:"skills"`
	} `json:"characters"`
	Cones []struct {
		ID, Name, Location                string
		Level, Ascension, Superimposition int
	} `json:"light_cones"`
	Relics []struct {
		SetID                          string `json:"set_id"`
		Name, Slot, Mainstat, Location string
		Rarity, Level                  int
		Substats                       []stat `json:"substats"`
	} `json:"relics"`
}

// srKeys 关联导出器英文属性与喵喵的星铁属性。
var srKeys = map[string]string{"HP": "hpPlus", "HP_": "hp", "ATK": "atkPlus", "ATK_": "atk", "DEF": "defPlus", "DEF_": "def", "SPD": "speed", "CRIT Rate_": "cpct", "CRIT DMG_": "cdmg", "Energy Regeneration Rate_": "recharge", "Energy Regeneration Rate": "recharge", "Outgoing Healing Boost_": "heal", "Outgoing Healing Boost": "heal", "Effect Hit Rate_": "effPct", "Effect Hit Rate": "effPct", "Effect RES_": "effDef", "Break Effect_": "stance", "Physical DMG Boost": "phy", "Fire DMG Boost": "fire", "Ice DMG Boost": "ice", "Lightning DMG Boost": "elec", "Wind DMG Boost": "wind", "Quantum DMG Boost": "quantum", "Imaginary DMG Boost": "imaginary"}

// starrail 只用path中的已保存快照生成星铁卡片，不更新或修改游戏装备。
func (g *generator) starrail(path string) account {
	var src srSource
	read(path, &src)
	a := account{Game: "sr", UID: fmt.Sprint(src.Metadata.UID), SnapshotAt: "2026-10-07", Source: "Reliquary Archiver · 已核验库存快照"}
	elems := map[string]string{"物理": "phy", "火": "fire", "冰": "ice", "雷": "elec", "风": "wind", "量子": "quantum", "虚数": "imaginary"}
	for _, c := range src.Characters {
		id, err := strconv.Atoi(c.ID)
		must(err)
		m := g.pick("sr", id, c.Version)
		image, banner := g.portrait(m)
		v := card{Key: "sr-" + c.ID, ID: id, Name: m.Name, RuleName: m.Name, Game: "sr", Element: elems[m.Elem], Path: m.Path, Level: c.Level, Cons: c.Eidolon, Star: m.Star, Image: image, Banner: banner, BaseAttr: m.Base, Attr: map[string]float64{}, Artifacts: []artifact{}, Notes: []string{}}
		v.Talents = []talent{{"普攻", c.Skills.Basic}, {"战技", c.Skills.Skill}, {"终结技", c.Skills.Ult}, {"天赋", c.Skills.Talent}}
		for _, w := range src.Cones {
			if w.Location != c.ID {
				continue
			}
			id, err := strconv.Atoi(w.ID)
			must(err)
			data, dir := g.weaponMeta("sr", "", id)
			if dir == "" {
				panic("光锥资料缺失: " + w.ID)
			}
			var name string
			var star int
			decode(data, "name", &name)
			decode(data, "star", &star)
			v.Weapon = &weapon{Name: name, Level: w.Level, Affix: w.Superimposition, Star: star, Image: g.media(filepath.Join(dir, "icon.webp"))}
		}
		if v.Weapon == nil {
			v.Notes = append(v.Notes, "本次快照没有已装备光锥")
		}
		for _, r := range src.Relics {
			if r.Location != c.ID {
				continue
			}
			set, ok := g.srSets[r.SetID]
			if !ok {
				panic("遗器套装资料缺失: " + r.SetID)
			}
			idx := map[string]int{"Head": 1, "Hands": 2, "Body": 3, "Feet": 4, "Planar Sphere": 5, "Link Rope": 6}[r.Slot]
			key := srKeys[r.Mainstat]
			// 导出器主词条不带百分号后缀，花/手才是固定生命/攻击。
			mainKeys := map[string]string{"HP": "hp", "ATK": "atk", "DEF": "def", "CRIT Rate": "cpct", "CRIT DMG": "cdmg", "Break Effect": "stance"}
			if mapped, ok := mainKeys[r.Mainstat]; ok {
				key = mapped
			}
			if idx == 1 {
				key = "hpPlus"
			}
			if idx == 2 {
				key = "atkPlus"
			}
			if idx == 0 || key == "" {
				panic("未知星铁部位或主词条: " + r.Slot + " / " + r.Mainstat)
			}
			ar := artifact{Idx: idx, Name: set.Idxs[strconv.Itoa(idx)].Name, Set: set.Name, Level: r.Level, Star: r.Rarity, Main: stat{Key: key}, Attrs: []stat{}, Image: g.media(filepath.Join(g.root, "resources/meta-sr/artifact", set.Name, "arti-"+fmt.Sprint(idx)+".webp"))}
			for _, s := range r.Substats {
				key := srKeys[s.Key]
				if key == "" {
					panic("未知星铁副词条: " + s.Key)
				}
				ar.Attrs = append(ar.Attrs, stat{key, s.Value})
			}
			v.Artifacts = append(v.Artifacts, ar)
		}
		a.Characters = append(a.Characters, v)
	}
	return a
}
